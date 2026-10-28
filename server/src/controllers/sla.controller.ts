import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, PipelineStage, RoleStatus, SlaCalculationResult } from '../types';
import { slaEngine } from '../services/sla.service';
import { alertEngine } from '../services/alert.service';

export class SlaController {
  public async getSummary(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const where: any = { status: 'OPEN' };

    if (user.role === 'MANAGER' || user.role === 'RECRUITER') {
      where.clientId = { in: user.assignedClientIds };
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
        recruiter: true
      }
    });

    let onTrackCount = 0;
    let amberCount = 0;
    let redCount = 0;
    let breachedCount = 0;

    const evaluatedClocks: SlaCalculationResult[] = [];

    for (const r of roles) {
      const holidays = r.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      const evalResult = slaEngine.evaluateRoleSla({
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

      evaluatedClocks.push(evalResult);

      if (evalResult.slaStatus === 'AMBER') amberCount++;
      else if (evalResult.slaStatus === 'RED') redCount++;
      else if (evalResult.slaStatus === 'BREACHED' || evalResult.isBreached) breachedCount++;
      else if (evalResult.slaStatus === 'ON_TRACK') onTrackCount++;
    }

    return res.json({
      totalActiveRoles: roles.length,
      onTrackCount,
      amberCount,
      redCount,
      breachedCount,
      atRiskCount: amberCount + redCount + breachedCount,
      clocks: evaluatedClocks.sort((a, b) => b.consumptionPercentage - a.consumptionPercentage)
    });
  }

  public async recalculateAndScanAlerts(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const roles = await prisma.recruitmentRole.findMany({
      where: { status: 'OPEN' },
      include: {
        client: {
          include: {
            slaPolicy: true,
            holidayCalendar: { include: { holidays: true } }
          }
        },
        recruiter: true
      }
    });

    let alertsCreated = 0;

    for (const r of roles) {
      const holidays = r.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      const evalResult = slaEngine.evaluateRoleSla({
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
        clientHolidays: holidays
      });

      // Update breached status in DB if breached
      if (evalResult.isBreached && !r.isBreached) {
        await prisma.recruitmentRole.update({
          where: { id: r.id },
          data: { isBreached: true, breachedAt: new Date() }
        });
      }

      // Check Rule 1 Amber
      const amberAlert = alertEngine.evaluateRule1AmberSla({
        roleId: r.id,
        roleTitle: r.title,
        clientName: r.client.name,
        clientId: r.clientId,
        consumptionPercentage: evalResult.consumptionPercentage,
        thresholdPercentage: 70.0,
        isShortlistMilestoneReached: evalResult.isShortlistMilestoneReached
      });

      if (amberAlert) {
        const existing = await prisma.alert.findUnique({ where: { deduplicationKey: amberAlert.deduplicationKey } });
        if (!existing) {
          await prisma.alert.create({
            data: {
              organizationId: user.organizationId,
              type: amberAlert.type,
              severity: amberAlert.severity,
              clientId: amberAlert.clientId,
              roleId: amberAlert.roleId,
              triggerRule: amberAlert.triggerRule,
              thresholdValue: amberAlert.thresholdValue,
              actualValue: amberAlert.actualValue,
              message: amberAlert.message,
              deduplicationKey: amberAlert.deduplicationKey
            }
          });
          alertsCreated++;
        }
      }

      // Check Rule 2 Red / Breached
      const redAlert = alertEngine.evaluateRule2RedSla({
        roleId: r.id,
        roleTitle: r.title,
        clientName: r.client.name,
        clientId: r.clientId,
        consumptionPercentage: evalResult.consumptionPercentage,
        thresholdPercentage: 90.0,
        isBreached: evalResult.isBreached
      });

      if (redAlert) {
        const existing = await prisma.alert.findUnique({ where: { deduplicationKey: redAlert.deduplicationKey } });
        if (!existing) {
          await prisma.alert.create({
            data: {
              organizationId: user.organizationId,
              type: redAlert.type,
              severity: redAlert.severity,
              clientId: redAlert.clientId,
              roleId: redAlert.roleId,
              triggerRule: redAlert.triggerRule,
              thresholdValue: redAlert.thresholdValue,
              actualValue: redAlert.actualValue,
              message: redAlert.message,
              deduplicationKey: redAlert.deduplicationKey
            }
          });
          alertsCreated++;
        }
      }
    }

    return res.json({ success: true, rolesScanned: roles.length, alertsCreated });
  }
}

export const slaController = new SlaController();
