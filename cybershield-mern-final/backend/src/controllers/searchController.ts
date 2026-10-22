import { Response } from 'express';
import { Threat, Incident, Vulnerability, Asset, Alert } from '../models';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class SearchController {
  public static async globalSearch(req: AuthenticatedRequest, res: Response) {
    const { q } = req.query as Record<string, string>;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    const term = q.trim();
    const regex = new RegExp(term, 'i');

    const [threatsDocs, incidentsDocs, vulnsDocs, assetsDocs, alertsDocs] = await Promise.all([
      Threat.find({
        $or: [{ indicator: regex }, { category: regex }, { description: regex }]
      }).limit(5),
      Incident.find({
        $or: [{ title: regex }, { description: regex }]
      }).limit(5),
      Vulnerability.find({
        $or: [{ cve_id: regex }, { title: regex }]
      }).limit(5),
      Asset.find({
        $or: [{ name: regex }, { ip_address: regex }, { hostname: regex }]
      }).limit(5),
      Alert.find({
        $or: [{ title: regex }, { description: regex }]
      }).limit(5)
    ]);

    const threats = threatsDocs.map((d) => d.toJSON());
    const incidents = incidentsDocs.map((d) => d.toJSON());
    const vulnerabilities = vulnsDocs.map((d) => d.toJSON());
    const assets = assetsDocs.map((d) => d.toJSON());
    const alerts = alertsDocs.map((d) => d.toJSON());

    const totalResults = threats.length + incidents.length + vulnerabilities.length + assets.length + alerts.length;

    return res.json({
      success: true,
      data: {
        query: q,
        totalResults,
        results: {
          threats,
          incidents,
          vulnerabilities,
          assets,
          alerts
        }
      }
    });
  }
}
