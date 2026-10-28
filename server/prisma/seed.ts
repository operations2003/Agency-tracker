import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Demo Seeding for Agency SLA and Margin Leakage Tracker ---');

  // Clear existing demo records
  await prisma.alertDeliveryLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.timeEntryAdjustment.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.billableHire.deleteMany();
  await prisma.financialAdjustment.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.slaExtension.deleteMany();
  await prisma.roleStageHistory.deleteMany();
  await prisma.recruitmentRole.deleteMany();
  await prisma.recruiterCostProfile.deleteMany();
  await prisma.userClientAssignment.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.holidayCalendar.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.contractTerm.deleteMany();
  await prisma.client.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Talent Global',
      slug: 'apex-talent-global'
    }
  });

  // 2. Create Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'owner@agency.io',
      name: 'Victoria Vance',
      role: 'OWNER',
      title: 'Managing Director & Founder',
      passwordHash
    }
  });

  const manager = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'manager@agency.io',
      name: 'Marcus Sterling',
      role: 'MANAGER',
      title: 'Head of Client Delivery',
      passwordHash
    }
  });

  const recruiter1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'recruiter1@agency.io',
      name: 'Sarah Jenkins',
      role: 'RECRUITER',
      title: 'Senior Technical Recruiter',
      passwordHash
    }
  });

  const recruiter2 = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'recruiter2@agency.io',
      name: 'David Kim',
      role: 'RECRUITER',
      title: 'Lead Executive Recruiter',
      passwordHash
    }
  });

  const finance = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'finance@agency.io',
      name: 'Claire Bennett',
      role: 'FINANCE',
      title: 'VP of Financial Operations',
      passwordHash
    }
  });

  console.log('Created Users: owner, manager, recruiter1, recruiter2, finance');

  // 3. Recruiter Cost Profiles
  await prisma.recruiterCostProfile.create({
    data: {
      userId: recruiter1.id,
      costType: 'HOURLY',
      hourlyCostRate: 48.0,
      standardWeeklyHours: 40.0,
      overheadMultiplier: 0.15, // 15% employer taxes & benefits
      effectiveFrom: new Date('2026-01-01')
    }
  });

  await prisma.recruiterCostProfile.create({
    data: {
      userId: recruiter2.id,
      costType: 'SALARIED',
      monthlySalary: 7200.0,
      standardWeeklyHours: 40.0,
      overheadMultiplier: 0.18,
      effectiveFrom: new Date('2026-01-01')
    }
  });

  // 4. Clients
  // Client 1: Acme Cloud (RETAINER)
  const clientAcme = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Acme Cloud Systems',
      code: 'ACME',
      billingModel: 'RETAINER',
      currency: 'USD',
      timeZone: 'America/New_York',
      marginWarningThreshold: 20.0,
      deadlinePolicy: 'WORKING_DAYS',
      notes: 'Strategic enterprise cloud client. Retainer contract with 14-day SLA deadline.',
      contractTerms: {
        create: {
          billingModel: 'RETAINER',
          billingRate: 15000.0,
          currency: 'USD',
          effectiveFrom: new Date('2026-01-01'),
          slaPenaltyPercentage: 5.0,
          notes: 'Standard monthly retainer'
        }
      },
      slaPolicy: {
        create: {
          defaultTargetDays: 14,
          deadlinePolicy: 'WORKING_DAYS',
          pauseOnHold: true,
          shortlistStageTarget: 'SHORTLIST_SUBMITTED'
        }
      }
    }
  });

  // Client 2: Nexus AI (HOURLY)
  const clientNexus = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Nexus AI Technologies',
      code: 'NEXUS',
      billingModel: 'HOURLY',
      currency: 'USD',
      timeZone: 'America/Chicago',
      marginWarningThreshold: 25.0,
      deadlinePolicy: 'WORKING_DAYS',
      notes: 'Specialized deep tech staffing billed hourly on approved time entries.',
      contractTerms: {
        create: {
          billingModel: 'HOURLY',
          billingRate: 95.0,
          currency: 'USD',
          effectiveFrom: new Date('2026-01-01')
        }
      },
      slaPolicy: {
        create: {
          defaultTargetDays: 10,
          deadlinePolicy: 'WORKING_DAYS',
          pauseOnHold: true
        }
      }
    }
  });

  // Client 3: Vertex Robotics (PER_HIRE)
  const clientVertex = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Vertex Health Robotics',
      code: 'VERTEX',
      billingModel: 'PER_HIRE',
      currency: 'USD',
      timeZone: 'America/Los_Angeles',
      marginWarningThreshold: 20.0,
      deadlinePolicy: 'CALENDAR_DAYS',
      notes: 'Contingency engineering placement with $9,500 fixed placement fee per hire.',
      contractTerms: {
        create: {
          billingModel: 'PER_HIRE',
          billingRate: 9500.0,
          currency: 'USD',
          effectiveFrom: new Date('2026-01-01')
        }
      },
      slaPolicy: {
        create: {
          defaultTargetDays: 21,
          deadlinePolicy: 'CALENDAR_DAYS',
          pauseOnHold: true
        }
      }
    }
  });

  // Client 4: Omega FinTech (RETAINER - Low Margin Leakage Case)
  const clientOmega = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Omega Global FinTech',
      code: 'OMEGA',
      billingModel: 'RETAINER',
      currency: 'USD',
      timeZone: 'America/New_York',
      marginWarningThreshold: 20.0,
      deadlinePolicy: 'WORKING_DAYS',
      notes: 'High-labor account currently suffering margin leakage due to extensive unscheduled sourcing.',
      contractTerms: {
        create: {
          billingModel: 'RETAINER',
          billingRate: 8000.0, // Fixed low retainer
          currency: 'USD',
          effectiveFrom: new Date('2026-01-01')
        }
      },
      slaPolicy: {
        create: {
          defaultTargetDays: 12,
          deadlinePolicy: 'WORKING_DAYS',
          pauseOnHold: true
        }
      }
    }
  });

  // 5. Client Assignments
  await prisma.userClientAssignment.createMany({
    data: [
      { userId: manager.id, clientId: clientAcme.id },
      { userId: manager.id, clientId: clientNexus.id },
      { userId: manager.id, clientId: clientVertex.id },
      { userId: manager.id, clientId: clientOmega.id },
      { userId: recruiter1.id, clientId: clientAcme.id },
      { userId: recruiter1.id, clientId: clientNexus.id },
      { userId: recruiter2.id, clientId: clientVertex.id },
      { userId: recruiter2.id, clientId: clientOmega.id }
    ]
  });

  // 6. Recruitment Roles
  const now = new Date();

  // Role 1: Acme - On Track
  const role1 = await prisma.recruitmentRole.create({
    data: {
      clientId: clientAcme.id,
      recruiterId: recruiter1.id,
      managerId: manager.id,
      title: 'Principal Distributed Systems Architect',
      description: 'Lead design of multi-region high throughput Kubernetes clusters.',
      priority: 'HIGH',
      status: 'OPEN',
      currentStage: 'SOURCING',
      requestReceivedDate: subDays(now, 3),
      slaStartDate: subDays(now, 3),
      slaDeadlineDate: addDays(now, 11),
      deadlinePolicy: 'WORKING_DAYS'
    }
  });

  // Role 2: Acme - Amber Warning (consumed >= 70% without shortlist)
  const role2 = await prisma.recruitmentRole.create({
    data: {
      clientId: clientAcme.id,
      recruiterId: recruiter1.id,
      managerId: manager.id,
      title: 'Senior Site Reliability Lead',
      description: 'Zero downtime automation and telemetry specialist.',
      priority: 'URGENT',
      status: 'OPEN',
      currentStage: 'SCREENING',
      requestReceivedDate: subDays(now, 10),
      slaStartDate: subDays(now, 10),
      slaDeadlineDate: addDays(now, 2), // 10/12 consumed = ~83% without shortlist
      deadlinePolicy: 'WORKING_DAYS'
    }
  });

  // Role 3: Nexus - Red Warning (consumed >= 90%)
  const role3 = await prisma.recruitmentRole.create({
    data: {
      clientId: clientNexus.id,
      recruiterId: recruiter1.id,
      managerId: manager.id,
      title: 'Lead NLP / LLM Research Engineer',
      description: 'Fine-tuning multimodal reasoning architectures.',
      priority: 'URGENT',
      status: 'OPEN',
      currentStage: 'SHORTLISTING',
      requestReceivedDate: subDays(now, 9),
      slaStartDate: subDays(now, 9),
      slaDeadlineDate: addDays(now, 1), // 90% consumed
      deadlinePolicy: 'WORKING_DAYS'
    }
  });

  // Role 4: Omega - Breached SLA
  const role4 = await prisma.recruitmentRole.create({
    data: {
      clientId: clientOmega.id,
      recruiterId: recruiter2.id,
      managerId: manager.id,
      title: 'VP of Information Security & Compliance',
      description: 'SOC2, ISO27001, and banking security protocols.',
      priority: 'HIGH',
      status: 'OPEN',
      currentStage: 'SOURCING',
      requestReceivedDate: subDays(now, 16),
      slaStartDate: subDays(now, 16),
      slaDeadlineDate: subDays(now, 2), // 2 days past deadline!
      deadlinePolicy: 'WORKING_DAYS',
      isBreached: true,
      breachedAt: subDays(now, 2)
    }
  });

  // Role 5: Vertex - Filled (Success)
  const role5 = await prisma.recruitmentRole.create({
    data: {
      clientId: clientVertex.id,
      recruiterId: recruiter2.id,
      managerId: manager.id,
      title: 'Senior Medical Robotics Control Engineer',
      description: 'Surgical robotics haptic feedback controllers.',
      priority: 'HIGH',
      status: 'FILLED',
      currentStage: 'HIRED_FILLED',
      requestReceivedDate: subDays(now, 25),
      slaStartDate: subDays(now, 25),
      slaDeadlineDate: subDays(now, 5),
      shortlistSubmittedDate: subDays(now, 15),
      filledDate: subDays(now, 2),
      deadlinePolicy: 'CALENDAR_DAYS'
    }
  });

  // 7. Billable Placement for Vertex
  await prisma.billableHire.create({
    data: {
      clientId: clientVertex.id,
      roleId: role5.id,
      candidateName: 'Dr. Raymond Zhao',
      hireDate: subDays(now, 2),
      feeAmount: 9500.0,
      currency: 'USD'
    }
  });

  // 8. Time Entries (for official margin calculation & workload)
  // Recruiter 1 logging on Acme (35 hours approved)
  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter1.id,
      clientId: clientAcme.id,
      roleId: role1.id,
      taskType: 'SOURCING',
      workDate: subDays(now, 2),
      hours: 18.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: subDays(now, 1),
      description: 'Deep sourcing of distributed systems architects across GitHub and IEEE papers'
    }
  });

  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter1.id,
      clientId: clientAcme.id,
      roleId: role2.id,
      taskType: 'SCREENING',
      workDate: subDays(now, 1),
      hours: 15.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: now,
      description: 'Technical screening interviews with 4 candidate leads'
    }
  });

  // Recruiter 1 on Nexus (15 hours approved)
  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter1.id,
      clientId: clientNexus.id,
      roleId: role3.id,
      taskType: 'INTERVIEW',
      workDate: now,
      hours: 12.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: now,
      description: 'Client interview prep and debrief sessions'
    }
  });

  // Recruiter 2 logging extensive hours on Omega -> causing LOW MARGIN leakage!
  // Cost: 130 hours * ~$45/hr = ~$5,850 + overhead -> ~ $6,900 cost against only $8,000 retainer = ~13% margin!
  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter2.id,
      clientId: clientOmega.id,
      roleId: role4.id,
      taskType: 'SOURCING',
      workDate: subDays(now, 5),
      hours: 45.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: subDays(now, 4),
      description: 'Executive search sourcing outreach across Tier 1 fintechs'
    }
  });

  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter2.id,
      clientId: clientOmega.id,
      roleId: role4.id,
      taskType: 'CANDIDATE_CALL',
      workDate: subDays(now, 3),
      hours: 40.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: subDays(now, 2),
      description: 'Confidential executive qualification calls'
    }
  });

  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter2.id,
      clientId: clientOmega.id,
      roleId: role4.id,
      taskType: 'COORDINATION',
      workDate: subDays(now, 1),
      hours: 35.0,
      isBillable: true,
      status: 'APPROVED',
      reviewedById: manager.id,
      reviewedAt: now,
      description: 'Compensation negotiation & background benchmarking'
    }
  });

  // Unapproved / submitted time entry (provisional flag test)
  await prisma.timeEntry.create({
    data: {
      recruiterId: recruiter1.id,
      clientId: clientAcme.id,
      roleId: role1.id,
      taskType: 'REPORTING',
      workDate: now,
      hours: 4.5,
      isBillable: true,
      status: 'SUBMITTED',
      description: 'Weekly candidate pipeline SLA report preparation'
    }
  });

  // 9. Initial Alerts for the 4 Business Rules
  // Alert 1: Rule 1 Amber SLA
  await prisma.alert.create({
    data: {
      organizationId: org.id,
      type: 'AMBER_SLA',
      severity: 'WARNING',
      clientId: clientAcme.id,
      roleId: role2.id,
      triggerRule: 'RULE 1 — AMBER SLA WARNING (≥70% consumed without shortlist)',
      thresholdValue: 70.0,
      actualValue: 83.3,
      message: 'Role "Senior Site Reliability Lead" for Acme Cloud Systems has consumed 83.3% of SLA without shortlist submission.',
      deduplicationKey: `AMBER_SLA:${role2.id}:70pct_milestone:2026-10-28`,
      status: 'OPEN'
    }
  });

  // Alert 2: Rule 2 Red SLA Breached
  await prisma.alert.create({
    data: {
      organizationId: org.id,
      type: 'RED_SLA',
      severity: 'CRITICAL',
      clientId: clientOmega.id,
      roleId: role4.id,
      triggerRule: 'RULE 2 — RED SLA BREACHED',
      thresholdValue: 100.0,
      actualValue: 115.0,
      message: 'Contractual SLA BREACHED for role "VP of Information Security & Compliance" (Omega Global FinTech)!',
      deduplicationKey: `RED_SLA:${role4.id}:breached:2026-10-28`,
      status: 'OPEN'
    }
  });

  // Alert 3: Rule 3 Low Margin Warning
  await prisma.alert.create({
    data: {
      organizationId: org.id,
      type: 'LOW_MARGIN',
      severity: 'WARNING',
      clientId: clientOmega.id,
      triggerRule: 'RULE 3 — LOW MARGIN (Below 20.0%)',
      thresholdValue: 20.0,
      actualValue: 13.5,
      message: 'Client "Omega Global FinTech" margin is 13.5% (below contractual safety threshold of 20.0%). Excessive direct labor hours detected.',
      deduplicationKey: `LOW_MARGIN:${clientOmega.id}:threshold:2026-10`,
      status: 'OPEN'
    }
  });

  // Alert 4: Rule 4 Recruiter Overload Warning
  await prisma.alert.create({
    data: {
      organizationId: org.id,
      type: 'RECRUITER_OVERLOAD',
      severity: 'WARNING',
      recruiterId: recruiter2.id,
      triggerRule: 'RULE 4 — RECRUITER OVERLOAD',
      thresholdValue: 45.0,
      actualValue: 120.0,
      message: 'Recruiter David Kim is overloaded: 120.0 hours recorded (limit: 45.0h) across active searches.',
      deduplicationKey: `RECRUITER_OVERLOAD:${recruiter2.id}:capacity:2026-W44`,
      status: 'OPEN'
    }
  });

  // 10. System Settings
  await prisma.systemSetting.createMany({
    data: [
      { organizationId: org.id, key: 'DEFAULT_MARGIN_WARNING', value: '20.0' },
      { organizationId: org.id, key: 'DEFAULT_SLA_AMBER', value: '70.0' },
      { organizationId: org.id, key: 'DEFAULT_SLA_RED', value: '90.0' },
      { organizationId: org.id, key: 'DEFAULT_MAX_OPEN_ROLES', value: '8' },
      { organizationId: org.id, key: 'DEFAULT_MAX_WEEKLY_HOURS', value: '45.0' },
      { organizationId: org.id, key: 'SLACK_WEBHOOK_URL', value: '' },
      { organizationId: org.id, key: 'WEEKLY_REPORT_EMAILS', value: 'management@agency.io' }
    ]
  });

  console.log('--- Demo Seeding Completed Successfully! ---');
  console.log('Demo Login Credentials:');
  console.log('  Owner:    owner@agency.io    / Password123!');
  console.log('  Manager:  manager@agency.io  / Password123!');
  console.log('  Recruiter: recruiter1@agency.io / Password123!');
  console.log('  Finance:  finance@agency.io  / Password123!');
}

main()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
