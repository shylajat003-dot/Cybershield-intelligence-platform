import { Severity, RiskScoreBreakdown } from '../types';

export class RiskScoringService {
  /**
   * Calculates a transparent, rule-based cybersecurity threat risk score between 0 and 100.
   */
  public static calculateRiskScore(params: {
    severity: Severity;
    confidence: number; // 0 - 100
    sourceReliability?: number; // 0 - 100, default 80
    recurrenceCount?: number; // default 1
  }): RiskScoreBreakdown {
    const { severity, confidence, sourceReliability = 80, recurrenceCount = 1 } = params;

    // 1. Severity Base Score
    let severityBase = 20;
    if (severity === 'MEDIUM') severityBase = 45;
    if (severity === 'HIGH') severityBase = 75;
    if (severity === 'CRITICAL') severityBase = 95;

    // 2. Confidence Contribution (up to 15 points)
    const confidenceContribution = Math.round((Math.max(0, Math.min(100, confidence)) / 100) * 15);

    // 3. Source Reliability Contribution (up to 10 points)
    const sourceReliabilityContribution = Math.round((Math.max(0, Math.min(100, sourceReliability)) / 100) * 10);

    // 4. Recurrence Contribution (up to 10 points)
    const recurrenceContribution = Math.min(10, Math.max(0, (recurrenceCount - 1) * 2.5));

    // 5. Final Score Calculation (65% Severity base + additions)
    const rawScore = Math.round((severityBase * 0.65) + confidenceContribution + sourceReliabilityContribution + recurrenceContribution);
    const score = Math.max(0, Math.min(100, rawScore));

    // Determine Risk Level
    let riskLevel: Severity = 'LOW';
    if (score >= 76) riskLevel = 'CRITICAL';
    else if (score >= 51) riskLevel = 'HIGH';
    else if (score >= 26) riskLevel = 'MEDIUM';

    const explanation = `Score calculated as Base Severity (${severityBase} x 0.65 = ${Math.round(severityBase * 0.65)}) + Confidence (+${confidenceContribution}) + Source Reliability (+${sourceReliabilityContribution}) + Recurrence Factor (+${recurrenceContribution}).`;

    return {
      score,
      severityScore: severityBase,
      confidenceContribution,
      sourceReliabilityContribution,
      recurrenceContribution,
      riskLevel,
      explanation
    };
  }
}
