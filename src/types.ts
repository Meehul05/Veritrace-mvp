export interface Investigation {
  id: string;
  case_number: string;
  investigating_officer: string;
  jurisdiction: string;
  created_at: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'SUBMITTED_TO_COURT';
}

export interface Evidence {
  id: string;
  investigation_id: string;
  original_filename: string;
  sanitized_filename: string;
  sha256: string;
  mime_type: string;
  size_bytes: number;
  storage_ref: string;
  ingested_at: string;
  media_type: 'image' | 'video';
}

export interface AnalysisJob {
  id: string;
  evidence_id: string;
  module_name: string;
  status: 'PENDING' | 'RUNNING' | 'OK' | 'UNAVAILABLE' | 'INCONCLUSIVE' | 'FAILED';
  pipeline_version: string;
  started_at: string;
  completed_at?: string;
  error_detail?: string;
}

export interface MetadataRecord {
  id: string;
  evidence_id: string;
  exif_json: string;
  camera_model?: string;
  gps_present: boolean;
  captured_at?: string;
  extraction_status: 'OK' | 'PARTIAL' | 'FAILED';
}

export interface C2PAManifest {
  id: string;
  evidence_id: string;
  manifest_state: 'VALID' | 'INVALID' | 'NOT_FOUND' | 'MODULE_UNAVAILABLE';
  issuer?: string;
  claim_generator?: string;
  signature_valid?: boolean;
  raw_manifest_json: string;
}

export interface FrameAnalysis {
  id: string;
  evidence_id: string;
  derived_artifact_id?: string;
  frame_index: number;
  timestamp_ms: number;
  ml_score: number;
  ml_label: string;
  confidence_band: 'LIKELY_MANIPULATED' | 'INCONCLUSIVE' | 'LIKELY_AUTHENTIC';
  pipeline_version: string;
  model_name: string;
  model_version: string;
  quality_flag: 'OK' | 'HIGH_DEGRADATION' | 'LOW_RESOLUTION' | 'BLURRED';
  heatmap_artifact_id?: string;
  vit_fake_prob?: number;
  vit_real_prob?: number;
  vit_logit_fake?: number;
  vit_logit_real?: number;
  ela_score?: number;
  spectral_score?: number;
  swin_ai_prob?: number;
  swin_real_prob?: number;
  detected_source?: string;
  source_breakdown?: {
    stable_diffusion: number;
    midjourney: number;
    dalle: number;
    real: number;
    other_ai: number;
  };
  engine_used?: string;
  forensic_justification?: string;
  anomalies?: string[];
  sensor_analysis?: string;
  lighting_analysis?: string;
  anatomy_analysis?: string;
}

export interface PerceptualHashMatch {
  id: string;
  evidence_id: string;
  matched_evidence_id?: string;
  matched_filename?: string;
  phash_value: string;
  hamming_distance: number;
  matched_at: string;
}

export interface SearchResult {
  id: string;
  evidence_id: string;
  source: string;
  source_type?: string;
  matched_url: string;
  title?: string;
  indexed_at?: string;
  similarity_score?: number;
  retrieved_at: string;
  triggered_by: string;
  notes?: string;
  is_open_source?: boolean;
}

export interface ResolvedSource {
  id: string;
  evidence_id: string;
  earliest_result_id?: string;
  earliest_indexed_at?: string;
  earliest_source_name?: string;
  earliest_context?: string;
  earliest_url?: string;
  identified_subject?: string;
  web_spread_summary?: string;
  osint_compliance?: string;
  resolution_status: 'RESOLVED' | 'NO_RESULTS' | 'AMBIGUOUS';
  resolved_at: string;
}

export interface ProvenanceNode {
  id: string;
  evidence_id: string;
  node_type: string;
  label: string;
  metadata: Record<string, any>;
}

export interface ProvenanceEdge {
  id: string;
  evidence_id: string;
  source: string;
  target: string;
  relationship: string;
  confidence: number;
}

export interface ForensicAssessment {
  id: string;
  evidence_id: string;
  pipeline_version: string;
  overall_status: 'COMPLETE' | 'PARTIAL' | 'INCONCLUSIVE';
  overall_confidence: number;
  verdict: string;
  assessment_data: Record<string, any>;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  evidence_id?: string;
  investigation_id?: string;
  actor: string;
  module_name: string;
  event_type: string;
  event_detail: Record<string, any>;
  timestamp: string;
}

export interface ForensicReport {
  id: string;
  evidence_id: string;
  investigation_id: string;
  forensic_assessment_id: string;
  generated_at: string;
  generated_by: string;
  storage_ref: string;
  report_hash: string;
  examiner_name: string;
  certification_status: 'DRAFT' | 'PENDING_CERTIFICATION' | 'CERTIFIED';
  certification_date?: string;
}

export interface AnalysisDetailsResponse {
  evidence: Evidence;
  jobs: AnalysisJob[];
  metadata?: MetadataRecord;
  c2pa?: C2PAManifest;
  frames: FrameAnalysis[];
  phash_matches: PerceptualHashMatch[];
  search_results: SearchResult[];
  resolved_source?: ResolvedSource;
  assessment?: ForensicAssessment;
  narrative?: {
    title: string;
    verdict: string;
    sections: Array<{ heading: string; body: string }>;
  };
}
