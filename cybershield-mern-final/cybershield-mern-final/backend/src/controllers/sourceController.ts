import { Response } from 'express';
import { ThreatSource } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import mongoose from 'mongoose';

export class SourceController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '20', search, status } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;

    const [docs, total] = await Promise.all([
      ThreatSource.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      ThreatSource.countDocuments(filter)
    ]);

    const sources = docs.map((d) => d.toJSON());

    return res.json({
      success: true,
      data: {
        sources,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const { name, type, description, reliability_score = 80, status = 'ACTIVE' } = req.body;

    const createdDoc = await ThreatSource.create({
      name,
      type,
      description,
      reliability_score,
      status
    });

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'SOURCE_CREATED', entity: 'SOURCE', entityId: createdDoc.id,
      details: { name, type }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Threat source created successfully', data: { source: createdDoc.toJSON() } });
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Threat source not found' });
    }

    const existing = await ThreatSource.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Threat source not found' });

    const { name, type, description, reliability_score, status } = req.body;

    if (name !== undefined) existing.name = name;
    if (type !== undefined) existing.type = type;
    if (description !== undefined) existing.description = description;
    if (reliability_score !== undefined) existing.reliability_score = reliability_score;
    if (status !== undefined) existing.status = status;

    await existing.save();

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'SOURCE_UPDATED', entity: 'SOURCE', entityId: id,
      details: { changes: req.body }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Threat source updated successfully', data: { source: existing.toJSON() } });
  }

  public static async remove(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Threat source not found' });
    }

    const existing = await ThreatSource.findByIdAndDelete(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Threat source not found' });

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'SOURCE_DELETED', entity: 'SOURCE', entityId: id,
      details: { name: existing.name }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Threat source deleted successfully' });
  }
}
