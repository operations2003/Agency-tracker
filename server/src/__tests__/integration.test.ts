import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('API Integration Tests', () => {
  let ownerToken: string;
  let recruiterToken: string;

  beforeAll(async () => {
    // 1. Authenticate Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@agency.io', password: 'Password123!' });

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.token).toBeDefined();
    ownerToken = ownerRes.body.token;

    // 2. Authenticate Recruiter
    const recruiterRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'recruiter1@agency.io', password: 'Password123!' });

    expect(recruiterRes.status).toBe(200);
    recruiterToken = recruiterRes.body.token;
  });

  it('rejects unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/v1/margins/summary');
    expect(res.status).toBe(401);
  });

  it('allows Owner to fetch agency-wide financial margins', async () => {
    const res = await request(app)
      .get('/api/v1/margins/summary')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBeGreaterThan(0);
    expect(res.body.totalDirectCost).toBeGreaterThan(0);
    expect(res.body.lowestMarginClients).toBeInstanceOf(Array);
  });

  it('forbids Recruiter from viewing agency financial margins', async () => {
    const res = await request(app)
      .get('/api/v1/margins/summary')
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(res.status).toBe(403);
  });

  it('returns SLA summary with active clocks and warnings', async () => {
    const res = await request(app)
      .get('/api/v1/sla/summary')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalActiveRoles).toBeGreaterThan(0);
    expect(res.body.amberCount).toBeGreaterThanOrEqual(1);
    expect(res.body.clocks).toBeInstanceOf(Array);
  });

  it('returns recruiter workload balancer overview with overload flags', async () => {
    const res = await request(app)
      .get('/api/v1/workload/overview')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalRecruiters).toBeGreaterThan(0);
    expect(res.body.recruiters).toBeInstanceOf(Array);
  });

  it('fetches alerts and resolves an alert with notes', async () => {
    const alertsRes = await request(app)
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.length).toBeGreaterThan(0);
    const targetAlert = alertsRes.body[0];

    const resolveRes = await request(app)
      .post(`/api/v1/alerts/${targetAlert.id}/resolve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ resolutionNotes: 'Reviewed with account manager and prioritized candidate shortlist.' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe('RESOLVED');
  });

  it('returns downloadable CSV template with correct headers', async () => {
    const res = await request(app)
      .get('/api/v1/csv/templates/clients')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('code,name,billingModel');
  });
});

