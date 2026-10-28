import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';

export class CostController {
  public async getCostProfiles(req: AuthenticatedRequest, res: Response) {
    const { recruiterId } = req.query;
    const where: any = {};
    if (recruiterId) where.userId = recruiterId as string;

    const profiles = await prisma.recruiterCostProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, title: true } }
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    return res.json(profiles);
  }

  public async createCostProfile(req: AuthenticatedRequest, res: Response) {
    const { userId, costType, hourlyCostRate, monthlySalary, standardWeeklyHours, overheadMultiplier, effectiveFrom } = req.body;

    if (!userId || !costType) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'userId and costType are required' });
    }

    const profile = await prisma.recruiterCostProfile.create({
      data: {
        userId,
        costType,
        hourlyCostRate: hourlyCostRate !== undefined ? parseFloat(hourlyCostRate) : null,
        monthlySalary: monthlySalary !== undefined ? parseFloat(monthlySalary) : null,
        standardWeeklyHours: standardWeeklyHours !== undefined ? parseFloat(standardWeeklyHours) : 40.0,
        overheadMultiplier: overheadMultiplier !== undefined ? parseFloat(overheadMultiplier) : 0.0,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date()
      },
      include: { user: true }
    });

    return res.status(201).json(profile);
  }
}

export const costController = new CostController();

