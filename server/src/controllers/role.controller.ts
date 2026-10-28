import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, PipelineStage, RoleStatus } from '../types';
import { slaEngine } from '../services/sla.service';
import { addWorkingDays } from '../utils/date-utils';
import { addDays } from 'date-fns';

export class RoleController {
  public async getRoles(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, recruiterId, stage, priority, status, search } = req.query;

    const where: any = {};

    // Scoping
    if (user.role === 'RECRUITER') {
      where.OR = [
        { recruiterId: user.id },
        { clientId: { in: user.assignedClientIds } }
      ];
    } else if (user.role === 'MANAGER') {
      where.clientId = { in: user.assignedClientIds };
    }

    if (clientId) where.clientId = clientId as string;
    if (recruiterId) where.recruiterId = recruiterId as string;
    if (stage) where.currentStage = stage as string;
    if (priority) where.priority = priority as string;
    if (status) where.status = status as string;
    if (search) {
      where.title = { contains: search as string };
    }

    const roles = await prisma.recruitmentRole.findMany({
      where,
      include: {
        client: {
          include: {
            slaPolicy: true,
            holidayCalendar: { include: { holidays: true } }
          }
        },
        recruiter: { select: { id: true, name: true, email: true } },
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { timeEntries: true } }
      },
      orderBy: [{ priority: 'desc' }, { slaDeadlineDate: 'asc' }]
    });

    const evaluatedRoles = roles.map(r => {
      const holidays = r.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      const slaEval = slaEngine.evaluateRoleSla({
        roleId: r.id,
        roleTitle: r.title,
        clientName: r.client.name,
        recruiterName: r.recruiter?.name || null,
        priority: r.priority,
        status: r.status as RoleStatus,
        currentStage: r.currentStage as PipelineStage,
        requestReceivedDate: r.requestReceivedDate,
        slaStartDate: r.slaStartDate,
        slaDeadlineDate: r.slaDeadlineDate,
        deadlinePolicy: r.deadlinePolicy as any,
        shortlistSubmittedDate: r.shortlistSubmittedDate,
        shortlistMilestoneStage: r.client.slaPolicy?.shortlistStageTarget as any,
        pauseOnHold: r.client.slaPolicy?.pauseOnHold,
        clientHolidays: holidays,
        businessHourStart: r.client.slaPolicy?.businessHourStart,
        businessHourEnd: r.client.slaPolicy?.businessHourEnd
      });

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        clientId: r.clientId,
        clientName: r.client.name,
        clientCode: r.client.code,
        recruiter: r.recruiter,
        manager: r.manager,
        priority: r.priority,
        status: r.status,
        currentStage: r.currentStage,
        requestReceivedDate: r.requestReceivedDate,
        slaStartDate: r.slaStartDate,
        slaDeadlineDate: r.slaDeadlineDate,
        deadlinePolicy: r.deadlinePolicy,
        shortlistSubmittedDate: r.shortlistSubmittedDate,
        filledDate: r.filledDate,
        isBreached: slaEval.isBreached,
        slaEvaluation: slaEval,
        timeEntriesCount: r._count.timeEntries,
        createdAt: r.createdAt
      };
    });

    return res.json(evaluatedRoles);
  }

  public async getRoleById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const role = await prisma.recruitmentRole.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            slaPolicy: true,
            holidayCalendar: { include: { holidays: true } }
          }
        },
        recruiter: true,
        manager: true,
        stageHistories: { orderBy: { createdAt: 'desc' } },
        timeEntries: {
          include: { recruiter: { select: { id: true, name: true } } },
          orderBy: { workDate: 'desc' }
        },
        slaExtensions: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!role) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Role not found' });
    }

    const holidays = role.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
    const slaEval = slaEngine.evaluateRoleSla({
      roleId: role.id,
      roleTitle: role.title,
      clientName: role.client.name,
      recruiterName: role.recruiter?.name || null,
      priority: role.priority,
      status: role.status as RoleStatus,
      currentStage: role.currentStage as PipelineStage,
      requestReceivedDate: role.requestReceivedDate,
      slaStartDate: role.slaStartDate,
      slaDeadlineDate: role.slaDeadlineDate,
      deadlinePolicy: role.deadlinePolicy as any,
      shortlistSubmittedDate: role.shortlistSubmittedDate,
      shortlistMilestoneStage: role.client.slaPolicy?.shortlistStageTarget as any,
      pauseOnHold: role.client.slaPolicy?.pauseOnHold,
      clientHolidays: holidays
    });

    return res.json({ ...role, slaEvaluation: slaEval });
  }

  public async createRole(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, title, description, priority, recruiterId, managerId, targetDays, deadlinePolicy } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientId and title are required' });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { slaPolicy: true, holidayCalendar: { include: { holidays: true } } }
    });

    if (!client) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Client not found' });
    }

    const start = new Date();
    const days = targetDays ? parseInt(targetDays, 10) : (client.slaPolicy?.defaultTargetDays || 14);
    const policy = deadlinePolicy || client.deadlinePolicy || 'WORKING_DAYS';

    let deadline: Date;
    if (policy === 'WORKING_DAYS') {
      const holidays = client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      deadline = addWorkingDays(start, days, holidays);
    } else {
      deadline = addDays(start, days);
    }

    const role = await prisma.recruitmentRole.create({
      data: {
        clientId,
        title: title.trim(),
        description,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        currentStage: 'NEW_REQUEST',
        recruiterId: recruiterId || null,
        managerId: managerId || user.id,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: policy,
        stageHistories: {
          create: {
            fromStage: null,
            toStage: 'NEW_REQUEST',
            notes: 'Role request created',
            changedBy: user.name
          }
        }
      }
    });

    return res.status(201).json(role);
  }

  public async updateRoleStage(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { newStage, notes } = req.body;
    const user = req.user!;

    if (!newStage) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'newStage is required' });
    }

    const role = await prisma.recruitmentRole.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Role not found' });
    }

    const updateData: any = {
      currentStage: newStage
    };

    // Stage triggers
    if (newStage === 'SHORTLIST_SUBMITTED' && !role.shortlistSubmittedDate) {
      updateData.shortlistSubmittedDate = new Date();
    }
    if (newStage === 'HIRED_FILLED') {
      updateData.status = 'FILLED';
      updateData.filledDate = new Date();
    } else if (newStage === 'CANCELLED') {
      updateData.status = 'CANCELLED';
    } else if (newStage === 'ON_HOLD') {
      updateData.status = 'ON_HOLD';
    } else if (role.status === 'ON_HOLD' && newStage !== 'ON_HOLD') {
      updateData.status = 'OPEN';
    }

    const updated = await prisma.recruitmentRole.update({
      where: { id },
      data: {
        ...updateData,
        stageHistories: {
          create: {
            fromStage: role.currentStage,
            toStage: newStage,
            notes: notes || `Moved to ${newStage}`,
            changedBy: user.name
          }
        }
      }
    });

    return res.json(updated);
  }

  public async requestSlaExtension(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { addedDays, reason } = req.body;
    const user = req.user!;

    if (!addedDays || !reason) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'addedDays and reason are required' });
    }

    const role = await prisma.recruitmentRole.findUnique({
      where: { id },
      include: { client: { include: { holidayCalendar: { include: { holidays: true } } } } }
    });

    if (!role) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Role not found' });
    }

    const days = parseInt(addedDays, 10);
    let newDeadline: Date;
    if (role.deadlinePolicy === 'WORKING_DAYS') {
      const holidays = role.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      newDeadline = addWorkingDays(role.slaDeadlineDate, days, holidays);
    } else {
      newDeadline = addDays(role.slaDeadlineDate, days);
    }

    await prisma.$transaction([
      prisma.slaExtension.create({
        data: {
          roleId: id,
          addedDays: days,
          reason,
          extendedBy: user.name
        }
      }),
      prisma.recruitmentRole.update({
        where: { id },
        data: { slaDeadlineDate: newDeadline }
      }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'SLA_EXTENDED',
          entityType: 'ROLE',
          entityId: id,
          details: JSON.stringify({ addedDays: days, reason, newDeadline })
        }
      })
    ]);

    return res.json({ success: true, newDeadline, message: `SLA extended by ${days} days.` });
  }
}

export const roleController = new RoleController();

