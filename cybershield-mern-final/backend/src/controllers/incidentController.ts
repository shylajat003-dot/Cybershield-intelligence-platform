import { Response } from 'express';
import { Incident, Alert } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import redisClient from '../config/redis';
import mongoose from 'mongoose';

export class IncidentController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '20', search, severity, status, sort = 'created_at', order = 'DESC' } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const sortOrder = order.toUpperCase() === 'ASC' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    const [docs, total] = await Promise.all([
      Incident.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('analyst_id', 'name email')
        .populate('affected_asset_id', 'name ip_address')
        .populate('related_threat_id', 'indicator severity'),
      Incident.countDocuments(filter)
    ]);

    const incidents = docs.map((doc) => {
      const json = doc.toJSON();
      if (doc.analyst_id && typeof doc.analyst_id === 'object' && 'name' in doc.analyst_id) {
        (json as any).analyst_name = (doc.analyst_id as any).name;
      }
      if (doc.affected_asset_id && typeof doc.affected_asset_id === 'object' && 'name' in doc.affected_asset_id) {
        (json as any).asset_name = (doc.affected_asset_id as any).name;
      }
      if (doc.related_threat_id && typeof doc.related_threat_id === 'object' && 'indicator' in doc.related_threat_id) {
        (json as any).threat_indicator = (doc.related_threat_id as any).indicator;
      }
      return json;
    });

    return res.json({
      success: true,
      data: {
        incidents,
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
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const doc = await Incident.findById(id)
      .populate('analyst_id', 'name email')
      .populate('affected_asset_id', 'name ip_address')
      .populate('related_threat_id', 'indicator severity');

    if (!doc) return res.status(404).json({ success: false, message: 'Incident not found' });

    const incident = doc.toJSON();
    if (doc.analyst_id && typeof doc.analyst_id === 'object' && 'name' in doc.analyst_id) {
      (incident as any).analyst_name = (doc.analyst_id as any).name;
    }
    if (doc.affected_asset_id && typeof doc.affected_asset_id === 'object' && 'name' in doc.affected_asset_id) {
      (incident as any).asset_name = (doc.affected_asset_id as any).name;
      (incident as any).asset_ip = (doc.affected_asset_id as any).ip_address;
    }
    if (doc.related_threat_id && typeof doc.related_threat_id === 'object' && 'indicator' in doc.related_threat_id) {
      (incident as any).threat_indicator = (doc.related_threat_id as any).indicator;
      (incident as any).threat_severity = (doc.related_threat_id as any).severity;
    }

    let related_alerts: any[] = [];
    if (doc.related_threat_id) {
      const threatObjId = typeof doc.related_threat_id === 'object' ? (doc.related_threat_id as any)._id : doc.related_threat_id;
      const alertDocs = await Alert.find({ related_threat_id: threatObjId }).sort({ created_at: -1 }).limit(5);
      related_alerts = alertDocs.map((a) => a.toJSON());
    }

    return res.json({ success: true, data: { incident, related_alerts } });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const { title, description, severity, status = 'OPEN', analyst_id, affected_asset_id, related_threat_id, detection_source, resolution_notes } = req.body;

    const timeline = [{
      timestamp: new Date().toISOString(),
      author: req.user?.name || 'System',
      action: 'Incident Created',
      notes: `Incident reported via ${detection_source || 'Manual Entry'}`
    }];

    const createdDoc = await Incident.create({
      title,
      description,
      severity,
      status,
      analyst_id: analyst_id && mongoose.Types.ObjectId.isValid(analyst_id) ? new mongoose.Types.ObjectId(analyst_id) : undefined,
      affected_asset_id: affected_asset_id && mongoose.Types.ObjectId.isValid(affected_asset_id) ? new mongoose.Types.ObjectId(affected_asset_id) : undefined,
      related_threat_id: related_threat_id && mongoose.Types.ObjectId.isValid(related_threat_id) ? new mongoose.Types.ObjectId(related_threat_id) : undefined,
      detection_source,
      resolution_notes,
      timeline
    });

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'INCIDENT_CREATED', entity: 'INCIDENT', entityId: createdDoc.id,
      details: { title, severity }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Incident created successfully', data: { incident: createdDoc.toJSON() } });
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const existing = await Incident.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { title, description, severity, status, analyst_id, affected_asset_id, related_threat_id, detection_source, resolution_notes, timeline_note } = req.body;

    let timeline = existing.timeline || [];
    if (timeline_note || (status && status !== existing.status)) {
      timeline = [...timeline, {
        timestamp: new Date().toISOString(),
        author: req.user?.name || 'Analyst',
        action: status && status !== existing.status ? `Status changed to ${status}` : 'Note Added',
        notes: timeline_note || ''
      }];
    }

    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (severity !== undefined) existing.severity = severity;
    if (status !== undefined) existing.status = status;
    if (detection_source !== undefined) existing.detection_source = detection_source;
    if (resolution_notes !== undefined) existing.resolution_notes = resolution_notes;
    if (analyst_id !== undefined) existing.analyst_id = analyst_id && mongoose.Types.ObjectId.isValid(analyst_id) ? new mongoose.Types.ObjectId(analyst_id) : undefined;
    if (affected_asset_id !== undefined) existing.affected_asset_id = affected_asset_id && mongoose.Types.ObjectId.isValid(affected_asset_id) ? new mongoose.Types.ObjectId(affected_asset_id) : undefined;
    if (related_threat_id !== undefined) existing.related_threat_id = related_threat_id && mongoose.Types.ObjectId.isValid(related_threat_id) ? new mongoose.Types.ObjectId(related_threat_id) : undefined;
    existing.timeline = timeline;

    await existing.save();

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'INCIDENT_UPDATED', entity: 'INCIDENT', entityId: id,
      details: { changes: req.body }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Incident updated successfully', data: { incident: existing.toJSON() } });
  }

  public static async remove(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const existing = await Incident.findByIdAndDelete(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Incident not found' });

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'INCIDENT_DELETED', entity: 'INCIDENT', entityId: id,
      details: { title: existing.title }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Incident deleted successfully' });
  }
}
