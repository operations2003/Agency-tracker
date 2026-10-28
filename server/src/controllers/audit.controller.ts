import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';

export class AuditController {
  public async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { action, entityType, limit } = req.query;

    const where: any = { organizationId: user.organizationId };
    if (action) where.action = action as string;
    if (entityType) where.entityType = entityType as string;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string, 10) : 100
    });

    return res.json(logs);
  }
}

export const auditController = new AuditController();

