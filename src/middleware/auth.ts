import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseServer.js';
import { getOrCreateUser } from '../db/users.js';
import {
  verifySessionToken,
  getOrCreateSupabaseProfile,
  isCourseAuthorizedForUser,
  getAuthorizedCourseTypes,
} from '../db/authRepository.js';
import type { AuthProfile, UserRole } from '../types/auth.js';

export interface AuthenticatedRequest extends Request {
  authProfile?: AuthProfile;
  rawToken?: string;
}

async function resolveAuthFromBearer(rawToken: string): Promise<{
  profile?: AuthProfile;
  accountStatus?: string;
  error?: string;
}> {
  // 1. Check PostgreSQL persistent session token first
  const sessionCheck = await verifySessionToken(rawToken);
  if (sessionCheck.valid && sessionCheck.profile) {
    return { profile: sessionCheck.profile };
  }

  // 2. Verify as a Supabase Auth JWT token if Supabase server client is configured
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(rawToken);
      if (!error && data?.user) {
        const sbUser = data.user;
        await getOrCreateUser(
          sbUser.id,
          sbUser.email || '',
          sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || undefined
        );
        const { profile } = await getOrCreateSupabaseProfile({
          uid: sbUser.id,
          email: sbUser.email || '',
          displayName:
            sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || undefined,
        });
        return { profile };
      }
    } catch {
      // Fall back to sessionCheck error
    }
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
  const verification = await resolveAuthFromBearer(rawToken);

  if (!verification.profile) {
    return res.status(verification.accountStatus ? 403 : 401).json({
      error: verification.error || 'Session invalid or expired.',
      accountStatus: verification.accountStatus,
      code: 'SESSION_INVALID',
    });
  }

  req.authProfile = verification.profile;
  req.rawToken = rawToken;
  next();
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await requireSessionAuth(req, res, () => {
      if (!req.authProfile || !allowedRoles.includes(req.authProfile.role)) {
        return res.status(403).json({
          error: `Access Denied — This endpoint requires ${allowedRoles.join(' or ')} authorization.`,
          code: 'FORBIDDEN_ROLE',
        });
      }
      next();
    });
  };
};

/**
 * Validates that the authenticated user is enrolled in or assigned to the target course/exam.
 * Rejects unauthorized cross-course access with HTTP 403.
 */
export function validateCourseAccessOrReject(
  profile: AuthProfile | undefined,
  targetCourseOrExam: string | undefined | null,
  res: Response,
  resourceLabel = 'resource'
): boolean {
  if (!profile) {
    res.status(401).json({
      error: 'Authentication required.',
      code: 'UNAUTHENTICATED',
    });
    return false;
  }

  if (profile.role === 'ADMIN') {
    return true;
  }

  if (profile.role === 'STUDENT' && profile.enrollmentStatus !== 'ACTIVE') {
    res.status(403).json({
      error: `Course Access Denied — Your ${profile.courseType} enrollment is currently ${profile.enrollmentStatus}.`,
      code: 'ENROLLMENT_INACTIVE',
    });
    return false;
  }

  if (!isCourseAuthorizedForUser(profile, targetCourseOrExam)) {
    const allowed = getAuthorizedCourseTypes(profile).join(', ');
    res.status(403).json({
      error: `Course Security Violation — Your account is enrolled in [${allowed}] and is not authorized to access ${targetCourseOrExam} ${resourceLabel}.`,
      code: 'COURSE_ISOLATION_VIOLATION',
    });
    return false;
  }

  return true;
}
