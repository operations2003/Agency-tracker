import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { backgroundWorker } from './jobs/worker';

const server = app.listen(config.port, () => {
  logger.info(`Agency SLA and Margin Leakage Tracker API running on http://localhost:${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);

  // Start background worker for durable job processing
  backgroundWorker.start();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server and worker gracefully.');
  backgroundWorker.stop();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Closing HTTP server and worker.');
  backgroundWorker.stop();
  server.close(() => {
    process.exit(0);
  });
});


