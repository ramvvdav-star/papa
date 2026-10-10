import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import {
  verifySessionToken,
  getOrCreateFirebaseProfile,
  isCourseAuthorizedForUser,
  getAuthorizedCourseTypes,
} from '../db/authRepository.ts';
import { AuthProfile, UserRole } from '../types/auth.ts';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  authProfile?: AuthProfile;
  rawToken?: string;
}

async function resolveAuthFromBearer(rawToken: string): Promise<{
  profile?: AuthProfile;
  decodedUser?: DecodedIdToken;
  accountStatus?: string;
  error?: string;
}> {
  // 1. Check institutional session token first if prefixed with sess_ or standard length
  const sessionCheck = await verifySessionToken(rawToken);
  if (sessionCheck.valid && sessionCheck.profile) {
    return { profile: sessionCheck.profile };
  }

  // 2. Otherwise verify as a Firebase ID token and synchronize with PostgreSQL users & profiles
  try {
    const decodedToken = await adminAuth.verifyIdToken(rawToken);
    if (decodedToken.uid) {
      await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || undefined
      );
      const { profile } = await getOrCreateFirebaseProfile({
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        displayName: decodedToken.name || undefined,
      });
      return { profile, decodedUser: decodedToken };
    }
  } catch {
    // Fall back to sessionCheck error
  }

  return {
    accountStatus: sessionCheck.accountStatus,
    error: sessionCheck.error || 'Session invalid or expired.',
  };
}

export const attachOptionalSessionAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    try {
      const resolved = await resolveAuthFromBearer(rawToken);
      if (resolved.profile) {
        req.authProfile = resolved.profile;
        req.user = resolved.decodedUser;
        req.rawToken = rawToken;
      }
    } catch {
      // ignore invalid optional token
    }
  }
  next();
};

export const verifyAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  return requireSessionAuth(req, res, next);
};

export const requireSessionAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to access the examination platform.',
      code: 'UNAUTHENTICATED',
    });
  }

  const rawToken = authHeader.slice(7).trim();
  try {
    const resolved = await resolveAuthFromBearer(rawToken);
    if (!resolved.profile) {
      return res.status(resolved.accountStatus ? 403 : 401).json({
        error: resolved.error || 'Session invalid or expired.',
        accountStatus: resolved.accountStatus,
        code: 'INVALID_SESSION',
      });
    }

    // Strict Enrollment Status check for Students (Section 1 & Section 24)
    if (
      resolved.profile.role === 'STUDENT' &&
      resolved.profile.enrollmentStatus &&
      resolved.profile.enrollmentStatus !== 'ACTIVE'
    ) {
      return res.status(403).json({
        error: `Course Enrollment ${resolved.profile.enrollmentStatus} — Your enrollment in ${resolved.profile.courseType} is not active.`,
        code: 'INACTIVE_ENROLLMENT',
        enrollmentStatus: resolved.profile.enrollmentStatus,
      });
    }

    req.authProfile = resolved.profile;
    req.user = resolved.decodedUser;
    req.rawToken = rawToken;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Failed to verify authentication session.' });
  }
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await requireSessionAuth(req, res, async () => {
      const profile = req.authProfile;
      if (!profile || !allowedRoles.includes(profile.role)) {
        const requiredText =
          allowedRoles.includes('ADMIN') && allowedRoles.length === 1
            ? 'Access Denied — Administrator privileges required.'
            : `Access Denied — Requires ${allowedRoles.join(' or ')} privileges.`;
        return res.status(403).json({
          error: requiredText,
          code: 'FORBIDDEN_ROLE',
        });
      }
      next();
    });
  };
};

export const validateCourseAccessOrReject = (
  profile: AuthProfile | undefined,
  requestedCourseOrExam: string | undefined | null,
  res: Response,
  resourceLabel: string = 'resource'
): boolean => {
  if (!profile) return true;
  if (profile.role === 'ADMIN') return true;
  if (!requestedCourseOrExam || requestedCourseOrExam === 'ALL') return true;

  if (!isCourseAuthorizedForUser(profile, requestedCourseOrExam)) {
    const allowed = getAuthorizedCourseTypes(profile).join(', ');
    res.status(403).json({
      error: `Course Access Denied — Your account is enrolled in [${allowed}] and is not authorized to access ${requestedCourseOrExam} ${resourceLabel}.`,
      code: 'COURSE_ACCESS_DENIED',
      enrolledCourses: getAuthorizedCourseTypes(profile),
      requestedCourse: requestedCourseOrExam,
    });
    return false;
  }
  return true;
};
