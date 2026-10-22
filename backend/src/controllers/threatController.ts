import { Response } from 'express';
import { Threat, ThreatSource } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { RiskScoringService } from '../services/riskScoringService';
import { AuditService } from '../services/auditService';
import { IngestionService } from '../services/ingestionService';
import { CorrelationService } from '../services/correlationService';
import redisClient from '../config/redis';
import mongoose from 'mongoose';

export class ThreatController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const { page = '1', limit = '20', search, severity, status, type, category, sort = 'created_at', order = 'DESC' } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { indicator: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (type) filter.indicator_type = type;
    if (category) filter.category = category;

    const sortOrder = order.toUpperCase() === 'ASC' ? 1 : -1;
    const sortField = sort === 'type' ? 'indicator_type' : sort;
    const sortObj: any = {};
    sortObj[sortField] = sortOrder;

    const [docs, total] = await Promise.all([
      Threat.find(filter).sort(sortObj).skip(skip).limit(limitNum).populate('source_id', 'name'),
      Threat.countDocuments(filter)
    ]);

    const threats = docs.map((doc) => {
      const json = doc.toJSON();
      if (doc.source_id && typeof doc.source_id === 'object' && 'name' in doc.source_id) {
        (json as any).source_name = (doc.source_id as any).name;
      }
      return json;
    });

    return res.json({
      success: true,
      data: {
        threats,
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
      return res.status(404).json({ success: false, message: 'Threat not found' });
    }

    const threatDoc = await Threat.findById(id).populate('source_id', 'name reliability_score');
    if (!threatDoc) return res.status(404).json({ success: false, message: 'Threat not found' });

    const threat = threatDoc.toJSON();
    let sourceReliability = 80;
    if (threatDoc.source_id && typeof threatDoc.source_id === 'object') {
      (threat as any).source_name = (threatDoc.source_id as any).name;
      if ('reliability_score' in threatDoc.source_id) {
        sourceReliability = (threatDoc.source_id as any).reliability_score;
      }
    }

    const riskBreakdown = RiskScoringService.calculateRiskScore({
      severity: threat.severity,
      confidence: threat.confidence,
      sourceReliability,
      recurrenceCount: threat.recurrence_count || 1
    });

    const correlation = await CorrelationService.correlateThreat(id);

    return res.json({ success: true, data: { threat, riskBreakdown, correlation } });
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    const { indicator, indicator_type, category, severity, confidence = 75, source_id, description, status = 'ACTIVE', tags = [], mitre_tactic, mitre_technique } = req.body;

    let validSourceId: mongoose.Types.ObjectId | undefined;
    let sourceReliability = 80;

    if (source_id && mongoose.Types.ObjectId.isValid(source_id)) {
      validSourceId = new mongoose.Types.ObjectId(source_id);
      const srcDoc = await ThreatSource.findById(validSourceId);
      if (srcDoc) sourceReliability = srcDoc.reliability_score || 80;
    }

    const riskCalc = RiskScoringService.calculateRiskScore({ severity, confidence, sourceReliability, recurrenceCount: 1 });

    const createdDoc = await Threat.create({
      indicator,
      indicator_type,
      category,
      severity,
      confidence,
      risk_score: riskCalc.score,
      source_id: validSourceId,
      description,
      status,
      tags,
      mitre_tactic,
      mitre_technique
    });

    if (validSourceId) {
      await ThreatSource.findByIdAndUpdate(validSourceId, { $inc: { indicator_count: 1 } });
    }

    await redisClient.del('dashboard_summary');

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'THREAT_CREATED', entity: 'THREAT', entityId: createdDoc.id,
      details: { indicator, severity, category }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Threat indicator created successfully', data: { threat: createdDoc.toJSON() } });
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Threat not found' });
    }

    const existing = await Threat.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Threat not found' });

    const { indicator, indicator_type, category, severity, confidence, source_id, description, status, tags, mitre_tactic, mitre_technique } = req.body;

    const newSeverity = severity || existing.severity;
    const newConfidence = confidence ?? existing.confidence;

    let sourceReliability = 80;
    const targetSourceId = source_id || existing.source_id;
    if (targetSourceId && mongoose.Types.ObjectId.isValid(targetSourceId.toString())) {
      const srcDoc = await ThreatSource.findById(targetSourceId);
      if (srcDoc) sourceReliability = srcDoc.reliability_score || 80;
    }

    const riskCalc = RiskScoringService.calculateRiskScore({ severity: newSeverity, confidence: newConfidence, sourceReliability, recurrenceCount: existing.recurrence_count || 1 });

    if (indicator !== undefined) existing.indicator = indicator;
    if (indicator_type !== undefined) existing.indicator_type = indicator_type;
    if (category !== undefined) existing.category = category;
    if (severity !== undefined) existing.severity = severity;
    if (confidence !== undefined) existing.confidence = confidence;
    if (description !== undefined) existing.description = description;
    if (status !== undefined) existing.status = status;
    if (tags !== undefined) existing.tags = tags;
    if (mitre_tactic !== undefined) existing.mitre_tactic = mitre_tactic;
    if (mitre_technique !== undefined) existing.mitre_technique = mitre_technique;
    if (source_id !== undefined) existing.source_id = source_id && mongoose.Types.ObjectId.isValid(source_id) ? new mongoose.Types.ObjectId(source_id) : undefined;

    existing.risk_score = riskCalc.score;
    await existing.save();

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'THREAT_UPDATED', entity: 'THREAT', entityId: id,
      details: { changes: req.body }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Threat updated successfully', data: { threat: existing.toJSON() } });
  }

  public static async remove(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Threat not found' });
    }

    const existing = await Threat.findByIdAndDelete(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Threat not found' });

    await redisClient.del('dashboard_summary');
    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'THREAT_DELETED', entity: 'THREAT', entityId: id,
      details: { indicator: existing.indicator }, ipAddress: req.ip
    });

    return res.json({ success: true, message: 'Threat deleted successfully' });
  }

  public static async ingest(req: AuthenticatedRequest, res: Response) {
    const { indicator, indicatorType, category, severity, confidence, sourceId, description, mitreTactic, mitreTechnique, tags } = req.body;

    const threatDoc = await IngestionService.ingestThreat({
      indicator, indicatorType, category, severity, confidence: confidence || 75,
      sourceId, description, mitreTactic, mitreTechnique, tags
    });

    const threat = threatDoc.toJSON ? threatDoc.toJSON() : threatDoc;

    await AuditService.logAction({
      userId: req.user?.id, userEmail: req.user?.email, userRole: req.user?.role,
      action: 'THREAT_INGESTED', entity: 'THREAT', entityId: threat.id,
      details: { indicator, severity, category }, ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Threat ingested and normalized successfully', data: { threat } });
  }
}
