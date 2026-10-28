import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';

export class SettingsController {
  public async getSettings(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const settings = await prisma.systemSetting.findMany({
      where: { organizationId: user.organizationId }
    });

    const defaults: Record<string, string> = {
      DEFAULT_MARGIN_WARNING: '20.0',
      DEFAULT_SLA_AMBER: '70.0',
      DEFAULT_SLA_RED: '90.0',
      DEFAULT_MAX_OPEN_ROLES: '8',
      DEFAULT_MAX_WEEKLY_HOURS: '45.0',
      SLACK_WEBHOOK_URL: '',
      WEEKLY_REPORT_EMAILS: 'management@agency.io',
      DEFAULT_TIMEZONE: 'America/New_York'
    };

    settings.forEach(s => {
      defaults[s.key] = s.value;
    });

    return res.json(defaults);
  }

  public async updateSettings(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const settingsObj = req.body;

    for (const [key, value] of Object.entries(settingsObj)) {
      await prisma.systemSetting.upsert({
        where: {
          organizationId_key: {
            organizationId: user.organizationId,
            key
          }
        },
        update: { value: String(value) },
        create: {
          organizationId: user.organizationId,
          key,
          value: String(value)
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'SETTING',
        entityId: user.organizationId,
        details: JSON.stringify(settingsObj)
      }
    });

    return res.json({ success: true, message: 'Settings saved successfully' });
  }
}

export const settingsController = new SettingsController();

