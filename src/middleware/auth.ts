import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../db/authRepository.ts';
import { AuthProfile, UserRole } from '../types/auth.ts';

export interface AuthenticatedRequest extends Request {
  authProfile?: AuthProfile;
  rawToken?: string;
}

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
        const requiredText = allowedRoles.includes('ADMIN') && allowedRoles.length === 1
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
