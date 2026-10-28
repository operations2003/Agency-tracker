import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';

export class AuthController {
  public async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        organization: true,
        assignments: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const assignedClientIds = user.assignments.map(a => a.clientId);

    const payload: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      organizationId: user.organizationId,
      assignedClientIds
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role })
      }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title,
        organizationName: user.organization.name,
        assignedClientIds
      }
    });
  }

  public async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        organization: true,
        assignments: {
          include: { client: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User record not found' });
    }

    const assignedClients = user.assignments.map(a => ({
      id: a.client.id,
      name: a.client.name,
      code: a.client.code
    }));

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        assignedClients,
        assignedClientIds: assignedClients.map(c => c.id)
      }
    });
  }

  public async logout(req: Request, res: Response) {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  public async getUsers(req: AuthenticatedRequest, res: Response) {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user?.organizationId },
      include: {
        assignments: {
          include: { client: true }
        },
        costProfiles: {
          orderBy: { effectiveFrom: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    const sanitized = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      title: u.title,
      isActive: u.isActive,
      assignedClients: u.assignments.map(a => ({ id: a.client.id, name: a.client.name, code: a.client.code })),
      currentCostProfile: u.costProfiles[0] || null
    }));

    return res.json(sanitized);
  }

  public async createUser(req: AuthenticatedRequest, res: Response) {
    const { email, name, role, title, password, assignedClientIds, costType, hourlyRate, monthlySalary } = req.body;
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Email, name, and role are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: 'CONFLICT', message: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password || 'Password123!', 10);
    const orgId = req.user!.organizationId;

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: email.toLowerCase().trim(),
        name,
        role,
        title,
        passwordHash
      }
    });

    if (assignedClientIds && Array.isArray(assignedClientIds)) {
      for (const clientId of assignedClientIds) {
        await prisma.userClientAssignment.create({
          data: { userId: user.id, clientId }
        });
      }
    }

    if (costType) {
      await prisma.recruiterCostProfile.create({
        data: {
          userId: user.id,
          costType,
          hourlyCostRate: hourlyRate ? parseFloat(hourlyRate) : null,
          monthlySalary: monthlySalary ? parseFloat(monthlySalary) : null,
          effectiveFrom: new Date()
        }
      });
    }

    return res.status(201).json(user);
  }

  public async updateUserAssignments(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { clientIds } = req.body;

    if (!Array.isArray(clientIds)) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientIds array required' });
    }

    // Delete existing assignments
    await prisma.userClientAssignment.deleteMany({ where: { userId: id } });

    // Insert new assignments
    for (const clientId of clientIds) {
      await prisma.userClientAssignment.create({
        data: { userId: id, clientId }
      });
    }

    return res.json({ success: true, message: 'Client assignments updated successfully' });
  }
}

export const authController = new AuthController();

