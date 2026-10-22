import { Router, Response } from 'express';
import { Threat } from '../models';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /api/mitre/mappings
 * Groups threats stored in the DB by their mitre_tactic and mitre_technique fields.
 */
router.get('/mappings', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mappedThreats = await Threat.find({
      $or: [{ mitre_tactic: { $ne: null } }, { mitre_technique: { $ne: null } }]
    }).sort({ created_at: -1 });

    const unmappedCount = await Threat.countDocuments({
      mitre_tactic: null,
      mitre_technique: null
    });

    const tacticMap: Record<string, { tactic: string; techniques: Record<string, any> }> = {};

    for (const doc of mappedThreats) {
      const tacticName = doc.mitre_tactic || 'Unknown Tactic';
      const techniqueName = doc.mitre_technique || 'Unknown Technique';
      const techKey = `${techniqueName}_${doc.severity}`;

      if (!tacticMap[tacticName]) {
        tacticMap[tacticName] = { tactic: tacticName, techniques: {} };
      }

      if (!tacticMap[tacticName].techniques[techKey]) {
        tacticMap[tacticName].techniques[techKey] = {
          technique: techniqueName,
          severity: doc.severity,
          threat_count: 0,
          max_risk_score: doc.risk_score || 0,
          last_seen: doc.created_at,
          indicator_types_set: new Set<string>()
        };
      }

      const tech = tacticMap[tacticName].techniques[techKey];
      tech.threat_count++;
      tech.max_risk_score = Math.max(tech.max_risk_score, doc.risk_score || 0);
      if (doc.indicator_type) {
        tech.indicator_types_set.add(doc.indicator_type);
      }
    }

    const formattedTactics = Object.values(tacticMap).map((t) => ({
      tactic: t.tactic,
      techniques: Object.values(t.techniques).map((tech) => ({
        technique: tech.technique,
        severity: tech.severity,
        threat_count: tech.threat_count,
        max_risk_score: tech.max_risk_score,
        last_seen: tech.last_seen,
        indicator_types: Array.from(tech.indicator_types_set).join(', ')
      }))
    }));

    return res.json({
      success: true,
      data: {
        tactics: formattedTactics,
        totalMappedThreats: mappedThreats.length,
        unmappedThreats: unmappedCount,
        source: 'live_database'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load MITRE mappings', error: String(err) });
  }
});

export default router;
