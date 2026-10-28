import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../db';
import { QueueService } from '../jobs/queue.service';


describe('Durable Database-backed Job Queue Service', () => {
  beforeEach(async () => {
    await prisma.backgroundJob.deleteMany();
  });

  it('enqueues a job with PENDING status and valid timestamp', async () => {
    const job = await QueueService.enqueue({
      jobType: 'SLA_RECALCULATION',
      payload: { trigger: 'test_manual' },
    });

    expect(job).toBeDefined();
    expect(job.status).toBe('PENDING');
    expect(job.jobType).toBe('SLA_RECALCULATION');
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
  });

  it('atomically claims a pending job for a specific worker', async () => {
    await QueueService.enqueue({
      jobType: 'ALERT_PROCESSING',
    });

    const claimed = await QueueService.claimNext('worker-instance-1');
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe('PROCESSING');
    expect(claimed?.lockedBy).toBe('worker-instance-1');
    expect(claimed?.attempts).toBe(1);

    // Another worker should not be able to claim the same job concurrently
    const secondClaim = await QueueService.claimNext('worker-instance-2');
    expect(secondClaim).toBeNull();
  });

  it('marks a job as COMPLETED upon successful execution', async () => {
    const job = await QueueService.enqueue({ jobType: 'WEEKLY_SUMMARY' });
    const claimed = await QueueService.claimNext('worker-instance-1');
    expect(claimed).not.toBeNull();

    const completed = await QueueService.complete(claimed!.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.lockedAt).toBeNull();
    expect(completed.lockedBy).toBeNull();
  });

  it('applies exponential backoff and retries when a job fails within maxAttempts', async () => {
    const job = await QueueService.enqueue({
      jobType: 'NOTIFICATION_RETRY',
      payload: { channel: 'SLACK' },
      maxAttempts: 3,
    });

    const claimed = await QueueService.claimNext('worker-instance-1');
    expect(claimed).not.toBeNull();

    const failed = await QueueService.fail(claimed!.id, 'Slack timeout 504');
    expect(failed?.status).toBe('PENDING');
    expect(failed?.lastError).toBe('Slack timeout 504');
    expect(failed?.attempts).toBe(1);
    // runAt should be scheduled into the future
    expect(new Date(failed!.runAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('permanently marks job as FAILED when maxAttempts is exceeded', async () => {
    const job = await QueueService.enqueue({
      jobType: 'CSV_IMPORT',
      maxAttempts: 1,
    });

    const claimed = await QueueService.claimNext('worker-instance-1');
    expect(claimed?.attempts).toBe(1);

    const permanentlyFailed = await QueueService.fail(claimed!.id, 'Fatal corrupt CSV payload');
    expect(permanentlyFailed?.status).toBe('FAILED');
    expect(permanentlyFailed?.lockedBy).toBeNull();
  });
});
