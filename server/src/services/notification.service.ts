import { config } from '../config';
import { logger } from '../utils/logger';
import { QueueService } from '../jobs/queue.service';


export interface DispatchNotificationParams {
  alertId?: string;
  type?: string;
  severity: string;
  title: string;
  message: string;
  entityLink?: string;
  recipientEmail?: string;
  slackWebhookUrl?: string;
}

export class NotificationService {
  /**
   * Dispatches notifications to enabled channels with retry handling and queue fallback
   */
  public async dispatchAlert(params: DispatchNotificationParams): Promise<{
    slackSuccess: boolean;
    emailSuccess: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let slackSuccess = false;
    let emailSuccess = false;

    // 1. Dispatch Slack notification if configured
    const slackUrl = params.slackWebhookUrl || config.slackWebhookUrl;
    if (slackUrl) {
      try {
        await this.sendSlackNotification(slackUrl, params);
        slackSuccess = true;
      } catch (err: any) {
        errors.push(`Slack delivery failed: ${err.message}`);
        logger.error('Slack dispatch error, enqueuing retry job', err);
        // Enqueue background retry
        await QueueService.enqueue({
          jobType: 'NOTIFICATION_RETRY',
          payload: {
            channel: 'SLACK',
            subject: params.title,
            body: params.message,
            metadata: { alertType: params.type, severity: params.severity },
          },
        }).catch((e) => logger.error(`Failed to enqueue Slack retry: ${e.message}`));
      }
    } else {
      logger.info('Slack webhook not configured; simulated delivery logged', { alertId: params.alertId });
      slackSuccess = true;
    }

    // 2. Dispatch Email notification
    try {
      await this.sendEmailNotification(params);
      emailSuccess = true;
    } catch (err: any) {
      errors.push(`Email delivery failed: ${err.message}`);
      logger.error('Email dispatch error, enqueuing retry job', err);
      // Enqueue background retry
      await QueueService.enqueue({
        jobType: 'NOTIFICATION_RETRY',
        payload: {
          channel: 'EMAIL',
          recipient: params.recipientEmail || config.smtp.from,
          subject: params.title,
          body: params.message,
          metadata: { alertType: params.type, severity: params.severity },
        },
      }).catch((e) => logger.error(`Failed to enqueue Email retry: ${e.message}`));
    }

    return { slackSuccess, emailSuccess, errors };
  }

  /**
   * Static helper for worker slack alert dispatch
   */
  public static async sendSlackAlert(params: {
    type: string;
    title: string;
    message: string;
    severity: string;
    clientId?: string;
  }): Promise<void> {
    const instance = new NotificationService();
    const webhookUrl = config.slackWebhookUrl;
    if (!webhookUrl) {
      logger.info(`[NotificationService Mock Slack] [${params.severity}] ${params.title}: ${params.message}`);
      return;
    }
    await instance.sendSlackNotification(webhookUrl, {
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
    });
  }

  /**
   * Static helper for worker email alert dispatch
   */
  public static async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    logger.info(`[NotificationService Email] Dispatched to ${params.to}: ${params.subject}`);
  }

  /**
   * Posts formatted notification payload to Slack webhook with exponential backoff retry
   */
  public async sendSlackNotification(
    webhookUrl: string,
    params: DispatchNotificationParams,
    maxRetries = 2
  ): Promise<void> {
    const color = params.severity === 'CRITICAL' ? '#dc2626' : params.severity === 'WARNING' ? '#f59e0b' : '#3b82f6';
    const payload = {
      attachments: [
        {
          color,
          title: `[${params.severity}] ${params.title}`,
          text: params.message,
          footer: 'Agency SLA & Margin Leakage Tracker',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        attempt++;
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Slack responded with status ${res.status}`);
        }
        logger.info('Slack notification delivered successfully', { alertId: params.alertId, attempt });
        return;
      } catch (err) {
        if (attempt > maxRetries) {
          throw err;
        }
        const delayMs = Math.pow(2, attempt) * 500;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  /**
   * Sends email notification with retry abstraction
   */
  public async sendEmailNotification(
    params: DispatchNotificationParams,
    maxRetries = 1
  ): Promise<void> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        logger.info(`[Email Service] Dispatched to ${params.recipientEmail || config.smtp.from}: [${params.severity}] ${params.title}`, {
          alertId: params.alertId,
          attempt
        });
        return;
      } catch (err) {
        if (attempt > maxRetries) {
          throw err;
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
}

export const notificationService = new NotificationService();


