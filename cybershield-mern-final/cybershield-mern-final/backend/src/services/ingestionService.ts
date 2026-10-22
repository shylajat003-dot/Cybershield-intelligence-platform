import { Threat, ThreatSource, Alert } from '../models';
import { RiskScoringService } from './riskScoringService';
import redisClient from '../config/redis';
import { IndicatorType, ThreatCategory, Severity } from '../types';
import mongoose from 'mongoose';

export interface IngestPayload {
  indicator: string;
  indicatorType: IndicatorType;
  category: ThreatCategory;
  severity: Severity;
  confidence: number;
  sourceId?: string;
  sourceName?: string;
  description?: string;
  mitreTactic?: string;
  mitreTechnique?: string;
  tags?: string[];
}

export class IngestionService {
  public static async ingestThreat(payload: IngestPayload): Promise<any> {
    const {
      indicator,
      indicatorType,
      category,
      severity,
      confidence,
      sourceId,
      sourceName = 'API Ingestion',
      description = 'Normalized threat indicator ingested via threat feed API',
      mitreTactic = 'Initial Access',
      mitreTechnique = 'T1190 - Exploit Public-Facing Application',
      tags = ['Ingested', category]
    } = payload;

    // Check duplicate
    const existingThreat = await Threat.findOne({ indicator });
    if (existingThreat) {
      const newRecurrence = (existingThreat.recurrence_count || 1) + 1;
      const riskCalc = RiskScoringService.calculateRiskScore({
        severity,
        confidence,
        sourceReliability: 85,
        recurrenceCount: newRecurrence
      });

      existingThreat.recurrence_count = newRecurrence;
      existingThreat.last_seen = new Date();
      existingThreat.risk_score = riskCalc.score;
      existingThreat.confidence = confidence;
      await existingThreat.save();

      await redisClient.del('dashboard_summary');
      return existingThreat;
    }

    // New Threat creation
    const riskCalc = RiskScoringService.calculateRiskScore({
      severity,
      confidence,
      sourceReliability: 85,
      recurrenceCount: 1
    });

    let validSourceId: mongoose.Types.ObjectId | undefined;
    if (sourceId && mongoose.Types.ObjectId.isValid(sourceId)) {
      validSourceId = new mongoose.Types.ObjectId(sourceId);
    }

    const createdThreat = await Threat.create({
      indicator,
      indicator_type: indicatorType,
      category,
      severity,
      confidence,
      risk_score: riskCalc.score,
      source_id: validSourceId,
      description,
      tags,
      mitre_tactic: mitreTactic,
      mitre_technique: mitreTechnique
    });

    if (validSourceId) {
      await ThreatSource.findByIdAndUpdate(validSourceId, {
        $inc: { indicator_count: 1 },
        $set: { last_updated: new Date() }
      });
    }

    // Auto-generate Alert if Critical or High
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      const alertTitle = `High Risk Threat Ingested: ${indicator}`;
      const newAlert = await Alert.create({
        title: alertTitle,
        description: `Automated SOC Alert triggered for newly ingested ${severity} severity indicator (${category}).`,
        severity,
        alert_type: 'Threat Feed Detection',
        source: sourceName,
        related_threat_id: createdThreat._id,
        status: 'NEW'
      });

      // Publish Real-time Event to Redis
      await redisClient.publish('sec_alerts', JSON.stringify(newAlert));
    }

    await redisClient.del('dashboard_summary');
    return createdThreat;
  }
}
