import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';

/**
 * Restricts endpoint to specified User Roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User is not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role(s)`
      });
    }

    next();
  };
}

/**
 * Verifies that the authenticated user has access to the requested client ID.
 * Agency Owner and Finance have agency-wide client access.
 * Account Manager and Recruiter must be explicitly assigned to the client.
 */
export function requireClientAccess(getClientIdFromReq: (req: AuthenticatedRequest) => string | undefined) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    // Owner and Finance have agency-wide scope
    if (req.user.role === 'OWNER' || req.user.role === 'FINANCE') {
      return next();
    }

    const clientId = getClientIdFromReq(req);
    if (!clientId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Missing client identifier' });
    }

    const hasAssignment = req.user.assignedClientIds.includes(clientId);
    if (!hasAssignment) {
      return res.status(403).json({
        error: 'CLIENT_ACCESS_DENIED',
        message: 'Forbidden: You do not have permission to view or manage data for this client account.'
      });
    }

    next();
  };
}
