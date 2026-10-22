import { Threat, Incident, Alert, Asset, Vulnerability } from '../models';
import { CorrelationResult } from '../types';
import mongoose from 'mongoose';

export class CorrelationService {
  public static async correlateThreat(threatId: string): Promise<CorrelationResult | null> {
    if (!mongoose.Types.ObjectId.isValid(threatId)) return null;

    const threatDoc = await Threat.findById(threatId).populate('source_id', 'name reliability_score');
    if (!threatDoc) return null;

    const threat = threatDoc.toJSON() as any;
    if (threatDoc.source_id && typeof threatDoc.source_id === 'object' && 'name' in threatDoc.source_id) {
      threat.source_name = (threatDoc.source_id as any).name;
    }

    // Find related Incidents
    const incidentsDocs = await Incident.find({ related_threat_id: threatId })
      .populate('analyst_id', 'name email')
      .populate('affected_asset_id', 'name ip_address');

    const relatedIncidents = incidentsDocs.map((doc) => {
      const json = doc.toJSON() as any;
      if (doc.analyst_id && typeof doc.analyst_id === 'object' && 'name' in doc.analyst_id) {
        json.analyst_name = (doc.analyst_id as any).name;
      }
      if (doc.affected_asset_id && typeof doc.affected_asset_id === 'object' && 'name' in doc.affected_asset_id) {
        json.asset_name = (doc.affected_asset_id as any).name;
      }
      return json;
    });

    // Find related Alerts
    const alertsDocs = await Alert.find({ related_threat_id: threatId }).sort({ created_at: -1 });
    const relatedAlerts = alertsDocs.map((doc) => doc.toJSON() as any);

    // Extract asset IDs from incidents and alerts
    const assetIdSet = new Set<string>();
    incidentsDocs.forEach((inc) => {
      if (inc.affected_asset_id) {
        const aId = typeof inc.affected_asset_id === 'object'
          ? (inc.affected_asset_id as any)._id?.toString()
          : (inc.affected_asset_id as any).toString();
        if (aId) assetIdSet.add(aId);
      }
    });
    alertsDocs.forEach((alt) => {
      if (alt.related_asset_id) {
        assetIdSet.add(alt.related_asset_id.toString());
      }
    });

    const assetObjectIds = Array.from(assetIdSet)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const assetsDocs = await Asset.find({ _id: { $in: assetObjectIds } });
    const relatedAssets = assetsDocs.map((doc) => doc.toJSON() as any);

    // Find Vulnerabilities associated with those affected assets
    let vulnerabilities: any[] = [];
    if (assetObjectIds.length > 0) {
      const vulnsDocs = await Vulnerability.find({ affected_asset_id: { $in: assetObjectIds } }).populate('affected_asset_id', 'name');
      vulnerabilities = vulnsDocs.map((v) => {
        const json = v.toJSON() as any;
        if (v.affected_asset_id && typeof v.affected_asset_id === 'object' && 'name' in v.affected_asset_id) {
          json.asset_name = (v.affected_asset_id as any).name;
        }
        return json;
      });
    }

    return {
      threat,
      relatedIncidents,
      relatedAlerts,
      relatedVulnerabilities: vulnerabilities,
      relatedAssets,
      mitreInfo: {
        tactic: threat.mitre_tactic || 'Command and Control',
        technique: threat.mitre_technique || 'T1071 - Application Layer Protocol'
      }
    };
  }
}
