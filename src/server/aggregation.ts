import { db } from './db';
import { AuditService } from './audit';
import { ForensicAssessment } from './types';

export class AggregationService {
  static readonly PIPELINE_VERSION = 'veritrace-v1.1.0-lock';

  /**
   * M12 Fan-in Aggregation Engine.
   * Invariant: Never overwrites previous rows; always creates new versioned record.
   * If any upstream module is degraded or unavailable, reflects that state cleanly.
   */
  static aggregate(evidenceId: string): ForensicAssessment {
    const evidence = db.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found.`);
    }

    const metadata = db.getMetadataRecord(evidenceId);
    const c2pa = db.getC2PAManifest(evidenceId);
    const frames = db.getFrameAnalyses(evidenceId);
    const phashMatches = db.getPerceptualHashMatches(evidenceId);
    const searchResults = db.getSearchResults(evidenceId);
    const resolvedSource = db.getResolvedSource(evidenceId);
    const jobs = db.getAnalysisJobs(evidenceId);

    const moduleBreakdown: Record<string, any> = {};
    for (const j of jobs) {
      moduleBreakdown[j.module_name] = {
        status: j.status,
        error: j.error_detail,
      };
    }

    let overallStatus: ForensicAssessment['overall_status'] = 'COMPLETE';
    let verdict = 'INCONCLUSIVE';
    let overallConfidence = 0.5;

    const validScores = frames.filter((f) => f.quality_flag === 'OK').map((f) => f.ml_score);
    const hasDegraded = frames.some((f) => f.quality_flag !== 'OK');
    const isMlUnavailable = jobs.some((j) => j.module_name === 'MLInference' && j.status === 'UNAVAILABLE');

    if (isMlUnavailable || frames.length === 0) {
      overallStatus = 'PARTIAL';
      overallConfidence = 0.0;
      verdict = 'INCONCLUSIVE (NEURAL MODEL UNAVAILABLE)';
    } else if (hasDegraded) {
      overallStatus = 'INCONCLUSIVE';
      overallConfidence = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0.5;
      verdict = 'INCONCLUSIVE (HIGH DEGRADATION / LOW RESOLUTION)';
    } else {
      const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
      overallConfidence = avgScore;
      if (avgScore >= 0.60) {
        verdict = 'LIKELY_MANIPULATED';
      } else if (avgScore <= 0.40) {
        verdict = 'LIKELY_AUTHENTIC';
      } else {
        verdict = 'INCONCLUSIVE';
      }
    }

    const assessmentId = `assess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assessmentData = {
      assessment_id: assessmentId,
      evidence_id: evidenceId,
      pipeline_version: this.PIPELINE_VERSION,
      overall_status: overallStatus,
      verdict,
      overall_confidence: Number(overallConfidence.toFixed(4)),
      evidence_summary: {
        filename: evidence.original_filename,
        sha256: evidence.sha256,
        size_bytes: evidence.size_bytes,
        mime_type: evidence.mime_type,
        media_type: evidence.media_type,
        ingested_at: evidence.ingested_at,
      },
      c2pa_status: c2pa?.manifest_state || 'NOT_FOUND',
      c2pa_issuer: c2pa?.issuer,
      camera_model: metadata?.camera_model,
      gps_present: metadata?.gps_present || false,
      captured_at: metadata?.captured_at,
      frames_evaluated: frames.length,
      frames_detail: frames.map((f) => ({
        index: f.frame_index,
        score: f.ml_score,
        band: f.confidence_band,
        quality: f.quality_flag,
      })),
      phash_matches_count: phashMatches.length,
      searches_count: searchResults.length,
      earliest_source: resolvedSource?.earliest_indexed_at,
      earliest_source_name: resolvedSource?.earliest_source_name,
      earliest_context: resolvedSource?.earliest_context,
      earliest_url: resolvedSource?.earliest_url,
      identified_subject: resolvedSource?.identified_subject,
      web_spread_summary: resolvedSource?.web_spread_summary,
      osint_compliance: resolvedSource?.osint_compliance,
      module_breakdown: moduleBreakdown,
    };

    const record: ForensicAssessment = {
      id: assessmentId,
      evidence_id: evidenceId,
      pipeline_version: this.PIPELINE_VERSION,
      overall_status: overallStatus,
      overall_confidence: Number(overallConfidence.toFixed(4)),
      verdict,
      assessment_data: assessmentData,
      created_at: new Date().toISOString(),
    };

    db.insertForensicAssessment(record);

    AuditService.logEvent(
      'System',
      'AggregationService',
      'ASSESSMENT_AGGREGATED',
      {
        assessment_id: assessmentId,
        verdict,
        overall_status: overallStatus,
        confidence: overallConfidence,
      },
      evidenceId
    );

    return record;
  }
}
