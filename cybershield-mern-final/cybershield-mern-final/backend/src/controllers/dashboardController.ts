import { Response } from 'express';
import { Threat, Incident, Vulnerability, Asset, Alert, ThreatSource } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import redisClient from '../config/redis';

export class DashboardController {
  public static async getSummary(req: AuthenticatedRequest, res: Response) {
    const CACHE_KEY = 'dashboard_summary';
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached), cached: true });
    }

    const [
      totalThreats,
      criticalThreats,
      activeIncidents,
      openVulns,
      monitoredAssets,
      activeAlerts,
      recentThreatsDocs,
      activeIncidentDocs,
      latestAlertsDocs,
      vulnerableAssetsDocs
    ] = await Promise.all([
      Threat.countDocuments({}),
      Threat.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' }),
      Incident.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] } }),
      Vulnerability.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      Asset.countDocuments({}),
      Alert.countDocuments({ status: { $in: ['NEW', 'INVESTIGATING'] } }),
      Threat.find({ severity: 'CRITICAL', status: 'ACTIVE' })
        .sort({ risk_score: -1 })
        .limit(5)
        .populate('source_id', 'name'),
      Incident.find({ status: { $in: ['OPEN', 'INVESTIGATING'] } })
        .sort({ created_at: -1 })
        .limit(5)
        .populate('analyst_id', 'name'),
      Alert.find({}).sort({ created_at: -1 }).limit(8),
      Asset.find({}).sort({ criticality: -1 }).limit(5)
    ]);

    const recentCriticalThreats = recentThreatsDocs.map((doc) => {
      const json = doc.toJSON();
      if (doc.source_id && typeof doc.source_id === 'object' && 'name' in doc.source_id) {
        (json as any).source_name = (doc.source_id as any).name;
      }
      return json;
    });

    const activeIncidentList = activeIncidentDocs.map((doc) => {
      const json = doc.toJSON();
      if (doc.analyst_id && typeof doc.analyst_id === 'object' && 'name' in doc.analyst_id) {
        (json as any).analyst_name = (doc.analyst_id as any).name;
      }
      return json;
    });

    const latestAlerts = latestAlertsDocs.map((doc) => doc.toJSON());
    const vulnerableAssets = vulnerableAssetsDocs.map((doc) => doc.toJSON());

    const summary = {
      totalThreats,
      criticalThreats,
      activeIncidents,
      openVulnerabilities: openVulns,
      monitoredAssets,
      activeAlerts,
      recentCriticalThreats,
      activeIncidentList,
      latestAlerts,
      vulnerableAssets
    };

    await redisClient.set(CACHE_KEY, JSON.stringify(summary), 60);

    return res.json({ success: true, data: summary, cached: false });
  }

  public static async getThreatTrends(req: AuthenticatedRequest, res: Response) {
    const { days = '7' } = req.query as Record<string, string>;
    const since = new Date(Date.now() - parseInt(days, 10) * 86400000);

    const threats = await Threat.find({ created_at: { $gte: since } }).select('created_at severity');

    const dayMap: Record<string, { date: string; count: number; severity: string }> = {};
    for (const row of threats) {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      const key = `${date}_${row.severity}`;
      if (!dayMap[key]) {
        dayMap[key] = { date, count: 0, severity: row.severity };
      }
      dayMap[key].count++;
    }

    return res.json({ success: true, data: { trends: Object.values(dayMap) } });
  }

  public static async getThreatSeverity(req: AuthenticatedRequest, res: Response) {
    const agg = await Threat.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const orderMap: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const severity = agg
      .map((item) => ({ severity: item._id, count: item.count }))
      .sort((a, b) => (orderMap[a.severity] || 5) - (orderMap[b.severity] || 5));

    return res.json({ success: true, data: { severity } });
  }

  public static async getThreatsByType(req: AuthenticatedRequest, res: Response) {
    const agg = await Threat.aggregate([
      { $group: { _id: '$indicator_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const types = agg.map((item) => ({ indicator_type: item._id, count: item.count }));
    return res.json({ success: true, data: { types } });
  }

  public static async getIncidentStatus(req: AuthenticatedRequest, res: Response) {
    const agg = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statuses = agg.map((item) => ({ status: item._id, count: item.count }));
    return res.json({ success: true, data: { statuses } });
  }

  public static async getVulnerabilitySummary(req: AuthenticatedRequest, res: Response) {
    const [sevAgg, statAgg] = await Promise.all([
      Vulnerability.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Vulnerability.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const orderMap: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const bySeverity = sevAgg
      .map((item) => ({ severity: item._id, count: item.count }))
      .sort((a, b) => (orderMap[a.severity] || 5) - (orderMap[b.severity] || 5));

    const byStatus = statAgg.map((item) => ({ status: item._id, count: item.count }));

    return res.json({ success: true, data: { bySeverity, byStatus } });
  }

  public static async getTopSources(req: AuthenticatedRequest, res: Response) {
    const sourcesDocs = await ThreatSource.find({});

    const sources = await Promise.all(
      sourcesDocs.map(async (src) => {
        const count = await Threat.countDocuments({ source_id: src._id });
        return {
          name: src.name,
          type: src.type,
          reliability_score: src.reliability_score,
          threat_count: count
        };
      })
    );

    sources.sort((a, b) => b.threat_count - a.threat_count);
    return res.json({ success: true, data: { sources: sources.slice(0, 6) } });
  }

  public static async getReports(req: AuthenticatedRequest, res: Response) {
    const { period = '7' } = req.query as Record<string, string>;
    const days = parseInt(period, 10);
    const since = new Date(Date.now() - days * 86400000);

    const [
      threatTotal, threatCritical, threatResolved,
      incTotal, incResolved, incActive,
      vulnTotal, vulnPatched, vulnCritical,
      alertTotal, alertCritical, alertResolved
    ] = await Promise.all([
      Threat.countDocuments({ created_at: { $gte: since } }),
      Threat.countDocuments({ created_at: { $gte: since }, severity: 'CRITICAL' }),
      Threat.countDocuments({ created_at: { $gte: since }, status: 'RESOLVED' }),

      Incident.countDocuments({ created_at: { $gte: since } }),
      Incident.countDocuments({ created_at: { $gte: since }, status: 'RESOLVED' }),
      Incident.countDocuments({ created_at: { $gte: since }, status: { $in: ['OPEN', 'INVESTIGATING'] } }),

      Vulnerability.countDocuments({ created_at: { $gte: since } }),
      Vulnerability.countDocuments({ created_at: { $gte: since }, status: 'PATCHED' }),
      Vulnerability.countDocuments({ created_at: { $gte: since }, cvss_score: { $gte: 9 } }),

      Alert.countDocuments({ created_at: { $gte: since } }),
      Alert.countDocuments({ created_at: { $gte: since }, severity: 'CRITICAL' }),
      Alert.countDocuments({ created_at: { $gte: since }, status: 'RESOLVED' })
    ]);

    return res.json({
      success: true,
      data: {
        period: days,
        threats: { total: threatTotal, critical: threatCritical, resolved: threatResolved },
        incidents: { total: incTotal, resolved: incResolved, active: incActive },
        vulnerabilities: { total: vulnTotal, patched: vulnPatched, critical: vulnCritical },
        alerts: { total: alertTotal, critical: alertCritical, resolved: alertResolved }
      }
    });
  }
}
