import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';

export class AuthController {
  public static async register(req: Request, res: Response) {
    const { name, email, password, role = 'SECURITY_ANALYST' } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userDoc = await User.create({
      name,
      email: email.toLowerCase(),
      password_hash,
      role
    });

    const user = userDoc.toJSON();
    delete (user as any).password_hash;

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, env.JWT.SECRET, {
      expiresIn: env.JWT.EXPIRES_IN as any
    });

    await AuditService.logAction({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_REGISTERED',
      entity: 'USER',
      entityId: user.id,
      details: { name, email, role },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token }
    });
  }

  public static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, userDoc.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userDoc.toJSON();
    delete (user as any).password_hash;

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      env.JWT.SECRET,
      { expiresIn: env.JWT.EXPIRES_IN as any }
    );

    await AuditService.logAction({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user.id,
      ipAddress: req.ip
    });

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    return res.json({
      success: true,
      message: 'Login successful',
      data: { user: userPayload, token }
    });
  }

  public static async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const userDoc = await User.findById(req.user.id).select('-password_hash');
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: { user: userDoc.toJSON() }
    });
  }
}
