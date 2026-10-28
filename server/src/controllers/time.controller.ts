import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';

export class TimeController {
  public async getTimeEntries(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { recruiterId, clientId, roleId, status, startDate, endDate } = req.query;

    const where: any = {};

    // Recruiter can only see their own time entries
    if (user.role === 'RECRUITER') {
      where.recruiterId = user.id;
    } else if (user.role === 'MANAGER') {
      where.clientId = { in: user.assignedClientIds };
    }

    if (recruiterId) where.recruiterId = recruiterId as string;
    if (clientId) where.clientId = clientId as string;
    if (roleId) where.roleId = roleId as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate.gte = new Date(startDate as string);
      if (endDate) where.workDate.lte = new Date(endDate as string);
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        recruiter: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, code: true } },
        role: { select: { id: true, title: true } },
        reviewedBy: { select: { id: true, name: true } },
        adjustments: true
      },
      orderBy: { workDate: 'desc' }
    });

    return res.json(entries);
  }

  public async createTimeEntry(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, roleId, taskType, workDate, hours, isBillable, description, status } = req.body;

    if (!clientId || !taskType || !workDate || hours === undefined) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientId, taskType, workDate, and hours are required' });
    }

    const numHours = parseFloat(hours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Hours must be a positive number between 0.1 and 24.0' });
    }

    const parsedDate = new Date(workDate);
    // Prevent logging more than 1 day in future
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 1);
    if (parsedDate > maxFuture) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Cannot log time for future dates' });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        recruiterId: user.id,
        clientId,
        roleId: roleId || null,
        taskType,
        workDate: parsedDate,
        hours: numHours,
        isBillable: isBillable !== undefined ? isBillable : true,
        description,
        status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
      },
      include: {
        client: true,
        role: true
      }
    });

    return res.status(201).json(entry);
  }

  public async updateTimeEntry(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = req.user!;
    const { taskType, workDate, hours, isBillable, description, status } = req.body;

    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Time entry not found' });
    }

    // Only owner can edit approved time entry without formal adjustment
    if (existing.status === 'APPROVED' && user.role !== 'OWNER') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Approved time entries cannot be modified directly. Submit an adjustment instead.'
      });
    }

    if (user.role === 'RECRUITER' && existing.recruiterId !== user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Cannot edit another recruiter’s time entry' });
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(taskType && { taskType }),
        ...(workDate && { workDate: new Date(workDate) }),
        ...(hours !== undefined && { hours: parseFloat(hours) }),
        ...(isBillable !== undefined && { isBillable }),
        ...(description !== undefined && { description }),
        ...(status && { status })
      }
    });

    return res.json(updated);
  }

  public async batchApproveEntries(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { entryIds, action, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!entryIds || !Array.isArray(entryIds) || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'entryIds array and action (APPROVE/REJECT) required' });
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    await prisma.timeEntry.updateMany({
      where: { id: { in: entryIds } },
      data: {
        status: newStatus,
        reviewedById: user.id,
        reviewedAt: new Date(),
        ...(action === 'REJECT' && { rejectionReason: rejectionReason || 'Rejected by manager' })
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: `TIME_ENTRIES_${action}D`,
        entityType: 'TIME_ENTRY',
        entityId: entryIds.join(','),
        details: JSON.stringify({ count: entryIds.length, action, rejectionReason })
      }
    });

    return res.json({ success: true, count: entryIds.length, status: newStatus });
  }

  public async createTimeAdjustment(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = req.user!;
    const { adjustedHours, reason } = req.body;

    if (adjustedHours === undefined || !reason) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'adjustedHours and reason are required' });
    }

    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Time entry not found' });
    }

    const numAdjusted = parseFloat(adjustedHours);

    const [adjustment, updatedEntry] = await prisma.$transaction([
      prisma.timeEntryAdjustment.create({
        data: {
          timeEntryId: id,
          adjustedHours: numAdjusted,
          reason,
          adjustedBy: user.name
        }
      }),
      prisma.timeEntry.update({
        where: { id },
        data: { hours: numAdjusted }
      }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'TIME_ENTRY_ADJUSTED',
          entityType: 'TIME_ENTRY',
          entityId: id,
          details: JSON.stringify({ oldHours: entry.hours, newHours: numAdjusted, reason })
        }
      })
    ]);

    return res.json({ success: true, adjustment, updatedEntry });
  }
}

export const timeController = new TimeController();

