import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';

export class ClientController {
  public async getClients(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { status, billingModel, search } = req.query;

    const where: any = { organizationId: user.organizationId };

    // Enforce role-based client scope for Manager and Recruiter
    if (user.role === 'MANAGER' || user.role === 'RECRUITER') {
      where.id = { in: user.assignedClientIds };
    }

    if (status) {
      where.status = status as string;
    }
    if (billingModel) {
      where.billingModel = billingModel as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { code: { contains: search as string } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        contractTerms: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1
        },
        slaPolicy: true,
        assignments: {
          include: { user: { select: { id: true, name: true, role: true, email: true } } }
        },
        _count: {
          select: {
            roles: { where: { status: 'OPEN' } },
            timeEntries: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = clients.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      status: c.status,
      billingModel: c.billingModel,
      currency: c.currency,
      timeZone: c.timeZone,
      marginWarningThreshold: c.marginWarningThreshold,
      deadlinePolicy: c.deadlinePolicy,
      notes: c.notes,
      activeContractTerm: c.contractTerms[0] || null,
      slaPolicy: c.slaPolicy,
      assignedUsers: c.assignments.map(a => a.user),
      openRolesCount: c._count.roles,
      createdAt: c.createdAt
    }));

    return res.json(formatted);
  }

  public async getClientById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = req.user!;

    if ((user.role === 'MANAGER' || user.role === 'RECRUITER') && !user.assignedClientIds.includes(id)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You are not assigned to this client account' });
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        contractTerms: { orderBy: { effectiveFrom: 'desc' } },
        slaPolicy: true,
        holidayCalendar: { include: { holidays: true } },
        assignments: { include: { user: true } },
        roles: {
          include: { recruiter: true, manager: true },
          orderBy: { createdAt: 'desc' }
        },
        invoices: { orderBy: { periodStart: 'desc' }, take: 10 },
        adjustments: { orderBy: { date: 'desc' } }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Client not found' });
    }

    return res.json(client);
  }

  public async createClient(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const {
      name,
      code,
      billingModel,
      billingRate,
      currency,
      timeZone,
      marginWarningThreshold,
      deadlinePolicy,
      targetSlaDays,
      notes,
      assignedUserIds
    } = req.body;

    if (!name || !code || !billingModel || billingRate === undefined) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Name, code, billingModel, and billingRate are required' });
    }

    const existing = await prisma.client.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: 'CONFLICT', message: `Client code "${code}" already exists` });
    }

    const client = await prisma.client.create({
      data: {
        organizationId: user.organizationId,
        name: name.trim(),
        code: code.toUpperCase().trim(),
        billingModel,
        currency: currency || 'USD',
        timeZone: timeZone || 'America/New_York',
        marginWarningThreshold: marginWarningThreshold !== undefined ? parseFloat(marginWarningThreshold) : 20.0,
        deadlinePolicy: deadlinePolicy || 'WORKING_DAYS',
        notes,
        contractTerms: {
          create: {
            billingModel,
            billingRate: parseFloat(billingRate),
            currency: currency || 'USD',
            effectiveFrom: new Date(),
            notes: 'Initial contract terms'
          }
        },
        slaPolicy: {
          create: {
            defaultTargetDays: targetSlaDays ? parseInt(targetSlaDays, 10) : 14,
            deadlinePolicy: deadlinePolicy || 'WORKING_DAYS',
            pauseOnHold: true
          }
        }
      }
    });

    if (assignedUserIds && Array.isArray(assignedUserIds)) {
      for (const uId of assignedUserIds) {
        await prisma.userClientAssignment.create({
          data: { userId: uId, clientId: client.id }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'CLIENT_CREATED',
        entityType: 'CLIENT',
        entityId: client.id,
        details: JSON.stringify({ name: client.name, code: client.code, billingModel })
      }
    });

    return res.status(201).json(client);
  }

  public async updateClient(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, status, timeZone, marginWarningThreshold, deadlinePolicy, notes } = req.body;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(status && { status }),
        ...(timeZone && { timeZone }),
        ...(marginWarningThreshold !== undefined && { marginWarningThreshold: parseFloat(marginWarningThreshold) }),
        ...(deadlinePolicy && { deadlinePolicy }),
        ...(notes !== undefined && { notes })
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: 'CLIENT_UPDATED',
        entityType: 'CLIENT',
        entityId: id,
        details: JSON.stringify(req.body)
      }
    });

    return res.json(updated);
  }

  public async createContractTerm(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { billingModel, billingRate, currency, effectiveFrom, slaPenaltyPercentage, notes } = req.body;

    if (!billingModel || billingRate === undefined) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'billingModel and billingRate are required' });
    }

    const term = await prisma.contractTerm.create({
      data: {
        clientId: id,
        billingModel,
        billingRate: parseFloat(billingRate),
        currency: currency || 'USD',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        slaPenaltyPercentage: slaPenaltyPercentage ? parseFloat(slaPenaltyPercentage) : 0,
        notes
      }
    });

    // Also update current billingModel on client
    await prisma.client.update({
      where: { id },
      data: { billingModel }
    });

    return res.status(201).json(term);
  }
}

export const clientController = new ClientController();
