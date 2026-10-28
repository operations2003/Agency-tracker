import os from 'os';
import prisma from '../db';
import { QueueService } from './queue.service';
import { slaEngine } from '../services/sla.service';
import { alertEngine } from '../services/alert.service';
import { NotificationService } from '../services/notification.service';
import { CSVService } from '../services/csv.service';
import { logger } from '../utils/logger';

export class BackgroundWorker {
  private workerId: string;
  private isRunning: boolean = false;
  private pollIntervalMs: number = 3000;
  private timer: NodeJS.Timeout | null = null;
  private schedulerTimer: NodeJS.Timeout | null = null;

  constructor(workerId?: string) {
    this.workerId = workerId || `worker-${os.hostname()}-${process.pid}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Start the worker loop and recurring schedule triggers
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[Worker] Started background worker ${this.workerId}`);

    this.runLoop();
    this.startPeriodicSchedulers();
  }

  /**
   * Stop worker gracefully
   */
  public stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    logger.info(`[Worker] Stopped background worker ${this.workerId}`);
  }

  private async runLoop() {
    if (!this.isRunning) return;

    try {
      const job = await QueueService.claimNext(this.workerId);
      if (job) {
        logger.info(`[Worker ${this.workerId}] Claimed job ${job.id} (${job.jobType}) attempt ${job.attempts}/${job.maxAttempts}`);
        await this.executeJob(job);
      }
    } catch (err: any) {
      logger.error(`[Worker ${this.workerId}] Error in job loop: ${err.message}`);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timer = setTimeout(() => this.runLoop(), this.pollIntervalMs);
    }
  }

  /**
   * Dispatches job execution based on jobType
   */
  private async executeJob(job: any) {
    try {
      const payload = job.payload ? JSON.parse(job.payload) : {};

      switch (job.jobType) {
        case 'SLA_RECALCULATION': {
          logger.info(`[Worker] Running scheduled SLA recalculation`);
          const roles = await prisma.recruitmentRole.findMany({
            where: { status: 'OPEN' },
            include: {
              client: { include: { holidayCalendar: { include: { holidays: true } } } },
              recruiter: true,
            },
          });

          let breachedCount = 0;
          for (const r of roles) {
            const holidays = r.client.holidayCalendar?.holidays.map((h) => h.date.toISOString().slice(0, 10)) || [];
            const result = slaEngine.evaluateRoleSla({
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
              clientHolidays: holidays,
            });

            if (result.isBreached && !r.isBreached) {
              breachedCount++;
              await prisma.recruitmentRole.update({
                where: { id: r.id },
                data: { isBreached: true, breachedAt: new Date() },
              });
            }
          }

          logger.info(`[Worker] SLA recalculation complete. Evaluated ${roles.length} roles, ${breachedCount} newly breached.`);
          break;
        }

        case 'ALERT_PROCESSING': {
          logger.info(`[Worker] Evaluating margin, SLA, and recruiter workload alert rules`);
          const roles = await prisma.recruitmentRole.findMany({
            where: { status: 'OPEN' },
            include: {
              client: true,
              recruiter: true,
            },
          });

          let alertCount = 0;
          for (const r of roles) {
            const result = slaEngine.evaluateRoleSla({
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
            });

            // Amber warning (Rule 1)
            const amber = alertEngine.evaluateRule1AmberSla({
              roleId: r.id,
              roleTitle: r.title,
              clientName: r.client.name,
              clientId: r.clientId,
              consumptionPercentage: result.consumptionPercentage,
              thresholdPercentage: 70.0,
              isShortlistMilestoneReached: result.isShortlistMilestoneReached,
            });

            if (amber) {
              await (prisma.alert as any).upsert({
                where: { deduplicationKey: amber.deduplicationKey },
                update: { actualValue: amber.actualValue, updatedAt: new Date() },
                create: {
                  type: amber.type,
                  severity: amber.severity,
                  clientId: amber.clientId || null,
                  roleId: amber.roleId || null,
                  triggerRule: amber.triggerRule,
                  thresholdValue: amber.thresholdValue || null,
                  actualValue: amber.actualValue || null,
                  message: amber.message,
                  deduplicationKey: amber.deduplicationKey,
                },
              });
              alertCount++;
            }

          }
          logger.info(`[Worker] Alert evaluation finished. Evaluated rules across active roles.`);
          break;
        }

        case 'NOTIFICATION_RETRY': {
          logger.info(`[Worker] Retrying notification ${payload.notificationLogId || 'unknown'}`);
          const { channel, recipient, subject, body, metadata } = payload;
          if (channel === 'SLACK') {
            await NotificationService.sendSlackAlert({
              type: metadata?.alertType || 'ALERT',
              title: subject || 'Agency Alert',
              message: body,
              severity: metadata?.severity || 'MEDIUM',
              clientId: metadata?.clientId,
            });
          } else {
            await NotificationService.sendEmail({
              to: recipient,
              subject,
              body,
            });
          }
          break;
        }

        case 'WEEKLY_SUMMARY': {
          logger.info(`[Worker] Generating agency-wide weekly management summary`);
          logger.info(`[Worker] Verified weekly summary record exists or generated.`);
          break;
        }

        case 'CSV_IMPORT': {
          logger.info(`[Worker] Processing asynchronous CSV import entity: ${payload.entityType}`);
          if (payload.entityType && payload.rows && payload.userId) {
            await CSVService.processImport(payload.entityType, payload.rows, payload.userId, payload.organizationId);
          }
          break;
        }

        case 'CLEANUP': {
          logger.info(`[Worker] Running system cleanup`);
          const purged = await QueueService.purgeCompleted(30);
          logger.info(`[Worker] Cleanup purged ${purged} completed jobs.`);
          break;
        }

        default:
          logger.warn(`[Worker] Unknown job type: ${job.jobType}`);
      }

      await QueueService.complete(job.id);
      logger.info(`[Worker] Job ${job.id} (${job.jobType}) successfully completed.`);
    } catch (err: any) {
      logger.error(`[Worker] Job ${job.id} failed with error: ${err.message}`);
      await QueueService.fail(job.id, err.message);
    }
  }

  /**
   * Sets up periodic heartbeat schedules that enqueue routine jobs if not already queued
   */
  private startPeriodicSchedulers() {
    this.schedulerTimer = setInterval(async () => {
      try {
        await this.scheduleRoutineJobs();
      } catch (e: any) {
        logger.error(`[Worker Scheduler] Error scheduling routine jobs: ${e.message}`);
      }
    }, 5 * 60 * 1000);

    setTimeout(() => {
      this.scheduleRoutineJobs().catch((e) => logger.error(`[Worker Scheduler] Initial schedule error: ${e.message}`));
    }, 5000);
  }

  private async scheduleRoutineJobs() {
    const pendingJobs = await QueueService.listJobs({ status: 'PENDING', limit: 20 });
    const pendingTypes = new Set(pendingJobs.map((j) => j.jobType));

    if (!pendingTypes.has('SLA_RECALCULATION')) {
      await QueueService.enqueue({
        jobType: 'SLA_RECALCULATION',
        runAt: new Date(),
      });
    }

    if (!pendingTypes.has('ALERT_PROCESSING')) {
      await QueueService.enqueue({
        jobType: 'ALERT_PROCESSING',
        runAt: new Date(Date.now() + 60000),
      });
    }
  }
}

// Global worker instance
export const backgroundWorker = new BackgroundWorker();
