import prisma from '../db';
import { logger } from '../utils/logger';


export interface EnqueueOptions {
  jobType: string;
  payload?: any;
  runAt?: Date;
  maxAttempts?: number;
}

export class QueueService {
  /**
   * Enqueue a job into the durable PostgreSQL-backed database table
   */
  static async enqueue(options: EnqueueOptions) {
    const { jobType, payload, runAt = new Date(), maxAttempts = 3 } = options;
    const job = await prisma.backgroundJob.create({
      data: {
        jobType,
        payload: payload ? JSON.stringify(payload) : null,
        runAt,
        maxAttempts,
        status: 'PENDING',
      },
    });
    logger.info(`[Queue] Enqueued job ${job.id} of type ${jobType} scheduled for ${runAt.toISOString()}`);
    return job;
  }

  /**
   * Atomically claim the next pending job or recover stale locks (older than leaseDurationMs)
   */
  static async claimNext(workerId: string, leaseDurationMs: number = 300000) {
    const now = new Date();
    const staleThreshold = new Date(Date.now() - leaseDurationMs);

    // Find first candidate: either PENDING with runAt <= now, or PROCESSING with stale lock
    const candidate = await prisma.backgroundJob.findFirst({
      where: {
        OR: [
          {
            status: 'PENDING',
            runAt: { lte: now },
          },
          {
            status: 'PROCESSING',
            lockedAt: { lte: staleThreshold },
          },
        ],
      },
      orderBy: {
        runAt: 'asc',
      },
    });

    if (!candidate) return null;

    // Attempt to acquire lock atomically
    const updated = await prisma.backgroundJob.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        lockedAt: candidate.lockedAt, // optimistic concurrency check
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        attempts: candidate.attempts + 1,
      },
    });

    if (updated.count === 0) {
      // Race condition: another worker claimed it
      return null;
    }

    return prisma.backgroundJob.findUnique({ where: { id: candidate.id } });
  }

  /**
   * Mark job as completed
   */
  static async complete(jobId: string) {
    return prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  /**
   * Fail job with exponential backoff or mark as FAILED
   */
  static async fail(jobId: string, error: string, backoffMultiplierMs: number = 5000) {
    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    const hasRetriesRemaining = job.attempts < job.maxAttempts;

    if (hasRetriesRemaining) {
      // Exponential backoff: attempt 1: 5s, attempt 2: 25s, attempt 3: 125s
      const delay = Math.pow(5, job.attempts) * 1000;
      const nextRunAt = new Date(Date.now() + delay);

      logger.warn(`[Queue] Job ${jobId} failed (${error}). Retrying in ${delay / 1000}s (attempt ${job.attempts}/${job.maxAttempts})`);

      return prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'PENDING',
          runAt: nextRunAt,
          lockedAt: null,
          lockedBy: null,
          lastError: error,
        },
      });
    } else {
      logger.error(`[Queue] Job ${jobId} permanently failed after ${job.attempts} attempts: ${error}`);
      return prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          lockedAt: null,
          lockedBy: null,
          lastError: error,
        },
      });
    }
  }

  /**
   * Query jobs by status or type
   */
  static async listJobs(params?: { status?: string; jobType?: string; limit?: number }) {
    const { status, jobType, limit = 50 } = params || {};
    return prisma.backgroundJob.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(jobType ? { jobType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Purge old completed jobs older than specified days
   */
  static async purgeCompleted(retentionDays: number = 30) {
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.backgroundJob.deleteMany({
      where: {
        status: 'COMPLETED',
        updatedAt: { lte: threshold },
      },
    });
    return result.count;
  }
}
