import { Response } from 'express';
import { AuditLog, User } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class AuditController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '30', action, entity } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;

    const [docs, total] = await Promise.all([
      AuditLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      AuditLog.countDocuments(filter)
    ]);

    const logs = docs.map((d) => d.toJSON());

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  }

  public static async getUsers(req: AuthenticatedRequest, res: Response) {
    const docs = await User.find({}).select('-password_hash').sort({ created_at: -1 });
    const users = docs.map((d) => d.toJSON());
    return res.json({ success: true, data: { users } });
  }
}
