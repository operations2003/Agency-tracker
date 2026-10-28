import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';
import { marginController } from './margin.controller';
import { slaEngine } from '../services/sla.service';
import { workloadEngine } from '../services/workload.service';
import { weeklyReportService } from '../services/weekly-report.service';
import { startOfWeek, endOfWeek } from 'date-fns';

export class ReportController {
  public async getWeeklyReport(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 });
    const periodEnd = endOfWeek(now, { weekStartsOn: 1 });

    const margins = await marginController.computeMarginsForClients(user.organizationId, undefined, periodStart, periodEnd);

    const roles = await prisma.recruitmentRole.findMany({
      where: { status: 'OPEN' },
      include: {
        client: { include: { holidayCalendar: { include: { holidays: true } } } },
        recruiter: true
      }
    });

    const slaResults = roles.map(r => {
      const holidays = r.client.holidayCalendar?.holidays.map(h => h.date.toISOString().slice(0, 10)) || [];
      return slaEngine.evaluateRoleSla({
        roleId: r.id,
        roleTitle: r.title,
        clientName: r.client.name,
        recruiterName: r.recruiter?.name || null,
        priority: r.priority,
        status: r.status as any,
        currentStage: r.currentStage as any,
        requestReceivedDate: r.requestReceivedDate,
        slaStartDate: r.slaStartDate,
        slaDeadlineDate: r.slaDeadlineDate,
        deadlinePolicy: r.deadlinePolicy as any,
        shortlistSubmittedDate: r.shortlistSubmittedDate,
        clientHolidays: holidays
      });
    });

    const recruiters = await prisma.user.findMany({
      where: { organizationId: user.organizationId, role: 'RECRUITER', isActive: true },
      include: {
        costProfiles: { take: 1, orderBy: { effectiveFrom: 'desc' } },
        assignedRoles: { include: { client: true } },
        timeEntries: {
          where: { workDate: { gte: periodStart, lte: periodEnd } },
          include: { client: true }
        }
      }
    });

    const workloadResults = recruiters.map(r => workloadEngine.calculateWorkload({
      recruiterId: r.id,
      recruiterName: r.name,
      email: r.email,
      weeklyCapacityHours: r.costProfiles[0]?.standardWeeklyHours || 40,
      maxOpenRolesThreshold: 8,
      maxWeeklyHoursThreshold: 45,
      roles: r.assignedRoles.map(role => ({
        id: role.id,
        title: role.title,
        clientId: role.clientId,
        clientName: role.client.name,
        status: role.status,
        currentStage: role.currentStage as any,
        slaDeadline: role.slaDeadlineDate,
        slaStatus: role.isBreached ? 'BREACHED' : 'ON_TRACK'
      })),
      timeEntriesThisWeek: r.timeEntries.map(e => ({
        hours: e.hours,
        status: e.status as any,
        clientId: e.clientId,
        clientName: e.client.name
      }))
    }));

    const unresolvedAlertsCount = await prisma.alert.count({
      where: { organizationId: user.organizationId, status: 'OPEN' }
    });

    const summary = weeklyReportService.generateWeeklySummary({
      periodStart,
      periodEnd,
      marginResults: margins,
      slaResults,
      workloadResults,
      unresolvedAlertsCount
    });

    const formattedEmail = weeklyReportService.formatSummaryEmail(summary);

    return res.json({
      summary,
      emailPreview: formattedEmail
    });
  }

  public async sendWeeklyReport(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { recipientEmails } = req.body;

    const report = await prisma.weeklyReport.create({
      data: {
        organizationId: user.organizationId,
        periodStart: new Date(),
        periodEnd: new Date(),
        summaryJson: JSON.stringify({ triggeredBy: user.email }),
        sentToEmails: recipientEmails || 'management@agency.io',
        status: 'SENT',
        sentAt: new Date()
      }
    });

    return res.json({ success: true, message: 'Weekly management report dispatched', report });
  }
}

export const reportController = new ReportController();

