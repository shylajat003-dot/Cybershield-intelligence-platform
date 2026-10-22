import { Response } from 'express';
import { Asset, Incident, Vulnerability, Alert } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import redisClient from '../config/redis';
import mongoose from 'mongoose';

export class AssetController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '20', search, criticality, status, asset_type, sort = 'created_at', order = 'DESC' } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ip_address: { $regex: search, $options: 'i' } },
        { hostname: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } }
      ];
    }
    if (criticality) filter.criticality = criticality;
    if (status) filter.status = status;
    if (asset_type) filter.asset_type = asset_type;

    const sortOrder = order.toUpperCase() === 'ASC' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    const [docs, total] = await Promise.all([
      Asset.find(filter).sort(sortObj).skip(skip).limit(limitNum),
      Asset.countDocuments(filter)
    ]);

    const assets = docs.map((d) => d.toJSON());

    return res.json({
      success: true,
      data: {
        assets,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const doc = await Asset.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Asset not found' });

    const asset = doc.toJSON();
    const assetObjectId = doc._id;

    const [incidentsDocs, vulnsDocs, alertsDocs] = await Promise.all([
      Incident.find({ affected_asset_id: assetObjectId }).sort({ created_at: -1 }).limit(5),
      Vulnerability.find({ affected_asset_id: assetObjectId }).sort({ cvss_score: -1 }).limit(5),
      Alert.find({ related_asset_id: assetObjectId }).sort({ created_at: -1 }).limit(5)
    ]);

    return res.json({
      success: true,
      data: {
        asset,
        related_incidents: incidentsDocs.map((i) => i.toJSON()),
        related_vulnerabilities: vulnsDocs.map((v) => v.toJSON()),
        related_alerts: alertsDocs.map((a) => a.toJSON())
      }
    });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const { name, ip_address, hostname, asset_type, environment = 'Production', owner, status = 'ONLINE', criticality = 'MEDIUM' } = req.body;

    const createdDoc = await Asset.create({
      name,
      ip_address,
      hostname,
      asset_type,
      environment,
      owner,
      status,
      criticality
    });

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'ASSET_CREATED', entity: 'ASSET', entityId: createdDoc.id,
      details: { name, ip_address, asset_type }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Asset registered successfully', data: { asset: createdDoc.toJSON() } });
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const existing = await Asset.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Asset not found' });

    const { name, ip_address, hostname, asset_type, environment, owner, status, criticality } = req.body;

    if (name !== undefined) existing.name = name;
    if (ip_address !== undefined) existing.ip_address = ip_address;
    if (hostname !== undefined) existing.hostname = hostname;
    if (asset_type !== undefined) existing.asset_type = asset_type;
    if (environment !== undefined) existing.environment = environment;
    if (owner !== undefined) existing.owner = owner;
    if (status !== undefined) existing.status = status;
    if (criticality !== undefined) existing.criticality = criticality;

    await existing.save();

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'ASSET_UPDATED', entity: 'ASSET', entityId: id,
      details: { changes: req.body }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Asset updated successfully', data: { asset: existing.toJSON() } });
  }

  public static async remove(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    const existing = await Asset.findByIdAndDelete(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Asset not found' });

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'ASSET_DELETED', entity: 'ASSET', entityId: id,
      details: { name: existing.name }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Asset removed successfully' });
  }
}
