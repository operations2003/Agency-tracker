import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev_super_secret_jwt_key_agency_tracker_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'alerts@agencytracker.io'
  },
  thresholds: {
    defaultMarginWarning: parseFloat(process.env.DEFAULT_MARGIN_WARNING || '20.0'),
    defaultSlaAmberPercentage: parseFloat(process.env.DEFAULT_SLA_AMBER || '70.0'),
    defaultSlaRedPercentage: parseFloat(process.env.DEFAULT_SLA_RED || '90.0'),
    defaultMaxOpenRoles: parseInt(process.env.DEFAULT_MAX_OPEN_ROLES || '8', 10),
    defaultMaxWeeklyHours: parseFloat(process.env.DEFAULT_MAX_WEEKLY_HOURS || '45.0')
  }
};
