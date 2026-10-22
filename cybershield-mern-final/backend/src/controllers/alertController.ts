import { Response } from 'express';
import { Alert } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import redisClient from '../config/redis';
import mongoose from 'mongoose';

export class AlertController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '20', search, severity, status, sort = 'created_at', order = 'DESC' } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { alert_type: { $regex: search, $options: 'i' } }
      ];
    }
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const sortOrder = order.toUpperCase() === 'ASC' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    const [docs, total] = await Promise.all([
      Alert.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('related_threat_id', 'indicator')
        .populate('related_asset_id', 'name'),
      Alert.countDocuments(filter)
    ]);

    const alerts = docs.map((doc) => {
      const json = doc.toJSON();
      if (doc.related_threat_id && typeof doc.related_threat_id === 'object' && 'indicator' in doc.related_threat_id) {
        (json as any).threat_indicator = (doc.related_threat_id as any).indicator;
      }
      if (doc.related_asset_id && typeof doc.related_asset_id === 'object' && 'name' in doc.related_asset_id) {
        (json as any).asset_name = (doc.related_asset_id as any).name;
      }
      return json;
    });

    return res.json({
      success: true,
      data: {
        alerts,
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
    const { title, description, severity, alert_type, source, related_threat_id, related_asset_id, status = 'NEW' } = req.body;

    const createdDoc = await Alert.create({
      title,
      description,
      severity,
      alert_type,
      source,
      related_threat_id: related_threat_id && mongoose.Types.ObjectId.isValid(related_threat_id) ? new mongoose.Types.ObjectId(related_threat_id) : undefined,
      related_asset_id: related_asset_id && mongoose.Types.ObjectId.isValid(related_asset_id) ? new mongoose.Types.ObjectId(related_asset_id) : undefined,
      status
    });

    const alertJson = createdDoc.toJSON();

    // Publish to Redis for real-time consumers
    await redisClient.publish('sec_alerts', JSON.stringify(alertJson));
    await redisClient.del('dashboard_summary');

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'ALERT_CREATED', entity: 'ALERT', entityId: createdDoc.id,
      details: { title, severity }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Alert created successfully', data: { alert: alertJson } });
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const existing = await Alert.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Alert not found' });

    const { title, description, severity, alert_type, source, related_threat_id, related_asset_id, status } = req.body;

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (severity !== undefined) existing.severity = severity;
    if (alert_type !== undefined) existing.alert_type = alert_type;
    if (source !== undefined) existing.source = source;
    if (status !== undefined) existing.status = status;
    if (related_threat_id !== undefined) existing.related_threat_id = related_threat_id && mongoose.Types.ObjectId.isValid(related_threat_id) ? new mongoose.Types.ObjectId(related_threat_id) : undefined;
    if (related_asset_id !== undefined) existing.related_asset_id = related_asset_id && mongoose.Types.ObjectId.isValid(related_asset_id) ? new mongoose.Types.ObjectId(related_asset_id) : undefined;

    await existing.save();

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'ALERT_UPDATED', entity: 'ALERT', entityId: id,
      details: { status }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Alert updated successfully', data: { alert: existing.toJSON() } });
  }

  // Server-Sent Events endpoint for real-time alert polling
  public static async streamAlerts(req: AuthenticatedRequest, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendNewAlerts = async () => {
      const since = new Date(Date.now() - 60000);
      const docs = await Alert.find({ status: 'NEW', created_at: { $gte: since } })
        .sort({ created_at: -1 })
        .limit(5)
        .populate('related_threat_id', 'indicator');

      if (docs.length > 0) {
        const alerts = docs.map((d) => {
          const json = d.toJSON();
          if (d.related_threat_id && typeof d.related_threat_id === 'object' && 'indicator' in d.related_threat_id) {
            (json as any).threat_indicator = (d.related_threat_id as any).indicator;
          }
          return json;
        });
        res.write(`data: ${JSON.stringify({ alerts })}\n\n`);
      }
    };

    await sendNewAlerts();
    const interval = setInterval(sendNewAlerts, 15000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
}
