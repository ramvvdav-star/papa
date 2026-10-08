import { Request, Response, NextFunction } from 'express';
import {
  verifySessionToken,
  isCourseAuthorizedForUser,
  getAuthorizedCourseTypes,
} from '../db/authRepository.ts';
import { AuthProfile, UserRole } from '../types/auth.ts';

export interface AuthenticatedRequest extends Request {
  authProfile?: AuthProfile;
  rawToken?: string;
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
      const verification = await verifySessionToken(rawToken);
      if (verification.valid && verification.profile) {
        req.authProfile = verification.profile;
        req.rawToken = rawToken;
      }
    } catch {
      // ignore invalid optional token
    }
  }
  next();
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
    const verification = await verifySessionToken(rawToken);
    if (!verification.valid || !verification.profile) {
      return res.status(verification.accountStatus ? 403 : 401).json({
        error: verification.error || 'Session invalid or expired.',
        accountStatus: verification.accountStatus,
        code: 'INVALID_SESSION',
      });
    }

    // Strict Enrollment Status check for Students (Section 1 & Section 24)
    if (
      verification.profile.role === 'STUDENT' &&
      verification.profile.enrollmentStatus &&
      verification.profile.enrollmentStatus !== 'ACTIVE'
    ) {
      return res.status(403).json({
        error: `Course Enrollment ${verification.profile.enrollmentStatus} — Your enrollment in ${verification.profile.courseType} is not active.`,
        code: 'INACTIVE_ENROLLMENT',
        enrollmentStatus: verification.profile.enrollmentStatus,
      });
    }

    req.authProfile = verification.profile;
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
