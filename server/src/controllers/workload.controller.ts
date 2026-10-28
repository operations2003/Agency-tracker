import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, PipelineStage } from '../types';
import { workloadEngine } from '../services/workload.service';
import { startOfWeek, endOfWeek } from 'date-fns';

export class WorkloadController {
  public async getOverview(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const recruiters = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: 'RECRUITER',
        isActive: true
      },
      include: {
        costProfiles: { orderBy: { effectiveFrom: 'desc' }, take: 1 },
        assignedRoles: {
          include: { client: true }
        },
        timeEntries: {
          where: { workDate: { gte: weekStart, lte: weekEnd } },
          include: { client: true }
        }
      }
    });

    const settings = await prisma.systemSetting.findMany({
      where: { organizationId: user.organizationId }
    });

    const settingMap = new Map<string, string>();
    settings.forEach(s => settingMap.set(s.key, s.value));

    const maxRoles = parseInt(settingMap.get('DEFAULT_MAX_OPEN_ROLES') || '8', 10);
    const maxHours = parseFloat(settingMap.get('DEFAULT_MAX_WEEKLY_HOURS') || '45.0');

    const workloads = recruiters.map(r => {
      const capacity = r.costProfiles[0]?.standardWeeklyHours || 40.0;
      const formattedRoles = r.assignedRoles.map(role => ({
        id: role.id,
        title: role.title,
        clientId: role.clientId,
        clientName: role.client.name,
        status: role.status,
        currentStage: role.currentStage as PipelineStage,
        slaDeadline: role.slaDeadlineDate,
        slaStatus: role.isBreached ? 'BREACHED' : 'ON_TRACK'
      }));

      const formattedEntries = r.timeEntries.map(e => ({
        hours: e.hours,
        status: e.status as any,
        clientId: e.clientId,
        clientName: e.client.name
      }));

      return workloadEngine.calculateWorkload({
        recruiterId: r.id,
        recruiterName: r.name,
        email: r.email,
        weeklyCapacityHours: capacity,
        maxOpenRolesThreshold: maxRoles,
        maxWeeklyHoursThreshold: maxHours,
        roles: formattedRoles,
        timeEntriesThisWeek: formattedEntries
      });
    });

    const overloadedCount = workloads.filter(w => w.isOverloaded).length;

    return res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalRecruiters: recruiters.length,
      overloadedCount,
      thresholds: {
        maxOpenRoles: maxRoles,
        maxWeeklyHours: maxHours
      },
      recruiters: workloads.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
    });
  }

  public async reassignRole(req: AuthenticatedRequest, res: Response) {
    const { roleId, newRecruiterId, reason } = req.body;
    const user = req.user!;

    if (!roleId || !newRecruiterId) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'roleId and newRecruiterId are required' });
    }

    const updated = await prisma.recruitmentRole.update({
      where: { id: roleId },
      data: { recruiterId: newRecruiterId }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ROLE_REASSIGNED',
        entityType: 'ROLE',
        entityId: roleId,
        details: JSON.stringify({ newRecruiterId, reason, reassignedBy: user.name })
      }
    });

    return res.json({ success: true, updated, message: 'Role successfully reassigned.' });
  }
}

export const workloadController = new WorkloadController();

