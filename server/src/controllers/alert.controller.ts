import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';
import { notificationService } from '../services/notification.service';

export class AlertController {
  public async getAlerts(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { status, severity, type, clientId } = req.query;

    const where: any = { organizationId: user.organizationId };

    if (user.role === 'MANAGER' || user.role === 'RECRUITER') {
      where.OR = [
        { clientId: { in: user.assignedClientIds } },
        { recruiterId: user.id }
      ];
    }

    if (status) where.status = status as string;
    if (severity) where.severity = severity as string;
    if (type) where.type = type as string;
    if (clientId) where.clientId = clientId as string;

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, code: true } },
        role: { select: { id: true, title: true } },
        resolvedBy: { select: { id: true, name: true } },
        deliveryLogs: { orderBy: { sentAt: 'desc' }, take: 5 }
      },
      orderBy: { detectedAt: 'desc' }
    });

    return res.json(alerts);
  }

  public async resolveAlert(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const user = req.user!;

    if (!resolutionNotes) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'resolutionNotes are required' });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedById: user.id,
        resolvedAt: new Date(),
        resolutionNotes
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ALERT_RESOLVED',
        entityType: 'ALERT',
        entityId: id,
        details: JSON.stringify({ resolutionNotes, resolvedBy: user.name })
      }
    });

    return res.json(updated);
  }

  public async reopenAlert(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = req.user!;

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'OPEN',
        resolvedById: null,
        resolvedAt: null,
        resolutionNotes: null
      }
    });

    return res.json(updated);
  }

  public async testDispatch(req: AuthenticatedRequest, res: Response) {
    const { alertId, channel } = req.body;

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: { client: true, role: true }
    });

    if (!alert) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Alert not found' });
    }

    const dispatchResult = await notificationService.dispatchAlert({
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: `${alert.triggerRule}: ${alert.client?.name || 'Agency Risk'}`,
      message: alert.message
    });

    // Record delivery log
    await prisma.alertDeliveryLog.create({
      data: {
        alertId: alert.id,
        channel: channel || 'SLACK',
        status: dispatchResult.slackSuccess ? 'DELIVERED' : 'FAILED',
        error: dispatchResult.errors.join('; ') || null
      }
    });

    return res.json({ success: true, dispatchResult });
  }
}

export const alertController = new AlertController();

