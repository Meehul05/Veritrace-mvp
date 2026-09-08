import fs from 'fs';
import path from 'path';
import {
  Investigation,
  Evidence,
  DerivedArtifact,
  AnalysisJob,
  MetadataRecord,
  C2PAManifest,
  FrameAnalysis,
  PerceptualHashMatch,
  SearchResult,
  ResolvedSource,
  ProvenanceNode,
  ProvenanceEdge,
  ForensicAssessment,
  AuditEvent,
  ForensicReport,
} from './types';

interface DatabaseSchema {
  investigations: Record<string, Investigation>;
  evidence: Record<string, Evidence>;
  derived_artifacts: Record<string, DerivedArtifact>;
  analysis_jobs: Record<string, AnalysisJob>;
  metadata_records: Record<string, MetadataRecord>;
  c2pa_manifests: Record<string, C2PAManifest>;
  frame_analyses: Record<string, FrameAnalysis>;
  perceptual_hash_matches: Record<string, PerceptualHashMatch>;
  search_results: Record<string, SearchResult>;
  resolved_sources: Record<string, ResolvedSource>;
  provenance_nodes: Record<string, ProvenanceNode>;
  provenance_edges: Record<string, ProvenanceEdge>;
  forensic_assessments: Record<string, ForensicAssessment>;
  audit_events: Record<string, AuditEvent>;
  forensic_reports: Record<string, ForensicReport>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'veritrace_db.json');

class ForensicDatabase {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error loading DB file, reinitializing schema:', err);
        this.data = this.createEmptySchema();
        this.save();
      }
    } else {
      this.data = this.createEmptySchema();
      this.save();
    }

    this.seedDefaultInvestigation();
  }

  private createEmptySchema(): DatabaseSchema {
    return {
      investigations: {},
      evidence: {},
      derived_artifacts: {},
      analysis_jobs: {},
      metadata_records: {},
      c2pa_manifests: {},
      frame_analyses: {},
      perceptual_hash_matches: {},
      search_results: {},
      resolved_sources: {},
      provenance_nodes: {},
      provenance_edges: {},
      forensic_assessments: {},
      audit_events: {},
      forensic_reports: {},
    };
  }

  private save(): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private seedDefaultInvestigation(): void {
    const existing = Object.values(this.data.investigations);
    if (existing.length === 0) {
      const defaultInv: Investigation = {
        id: 'inv_default_001',
        case_number: 'BSA-CYBER-2026-0842',
        investigating_officer: 'Inspector V. Sharma (Cyber Crime Cell)',
        jurisdiction: 'State Cyber Forensics Division',
        created_at: new Date().toISOString(),
        status: 'ACTIVE',
      };
      this.data.investigations[defaultInv.id] = defaultInv;
      this.save();
    }
  }

  // Investigations
  getInvestigations(): Investigation[] {
    return Object.values(this.data.investigations);
  }

  getInvestigation(id: string): Investigation | undefined {
    return this.data.investigations[id];
  }

  insertInvestigation(inv: Investigation): void {
    this.data.investigations[inv.id] = inv;
    this.save();
  }

  // Evidence
  getAllEvidence(): Evidence[] {
    return Object.values(this.data.evidence).sort(
      (a, b) => new Date(b.ingested_at).getTime() - new Date(a.ingested_at).getTime()
    );
  }

  getEvidence(id: string): Evidence | undefined {
    return this.data.evidence[id];
  }

  getEvidenceBySha256(sha256: string): Evidence | undefined {
    return Object.values(this.data.evidence).find((e) => e.sha256.toLowerCase() === sha256.toLowerCase());
  }

  insertEvidence(e: Evidence): void {
    this.data.evidence[e.id] = e;
    this.save();
  }

  // Derived Artifacts
  insertDerivedArtifact(a: DerivedArtifact): void {
    this.data.derived_artifacts[a.id] = a;
    this.save();
  }

  getDerivedArtifacts(evidenceId: string): DerivedArtifact[] {
    return Object.values(this.data.derived_artifacts).filter((a) => a.evidence_id === evidenceId);
  }

  getDerivedArtifact(id: string): DerivedArtifact | undefined {
    return this.data.derived_artifacts[id];
  }

  // Analysis Jobs
  insertAnalysisJob(j: AnalysisJob): void {
    this.data.analysis_jobs[j.id] = j;
    this.save();
  }

  updateAnalysisJob(
    id: string,
    status: AnalysisJob['status'],
    completedAt?: string,
    errorDetail?: string
  ): void {
    if (this.data.analysis_jobs[id]) {
      this.data.analysis_jobs[id].status = status;
      if (completedAt) this.data.analysis_jobs[id].completed_at = completedAt;
      if (errorDetail) this.data.analysis_jobs[id].error_detail = errorDetail;
      this.save();
    }
  }

  getAnalysisJobs(evidenceId: string): AnalysisJob[] {
    return Object.values(this.data.analysis_jobs).filter((j) => j.evidence_id === evidenceId);
  }

  // Metadata Records
  insertMetadataRecord(m: MetadataRecord): void {
    this.data.metadata_records[m.id] = m;
    this.save();
  }

  getMetadataRecord(evidenceId: string): MetadataRecord | undefined {
    return Object.values(this.data.metadata_records).find((m) => m.evidence_id === evidenceId);
  }

  // C2PA Manifests
  insertC2PAManifest(c: C2PAManifest): void {
    this.data.c2pa_manifests[c.id] = c;
    this.save();
  }

  getC2PAManifest(evidenceId: string): C2PAManifest | undefined {
    return Object.values(this.data.c2pa_manifests).find((c) => c.evidence_id === evidenceId);
  }

  // Frame Analyses
  insertFrameAnalysis(f: FrameAnalysis): void {
    for (const [key, existing] of Object.entries(this.data.frame_analyses)) {
      if (existing.evidence_id === f.evidence_id && existing.frame_index === f.frame_index) {
        delete this.data.frame_analyses[key];
      }
    }
    this.data.frame_analyses[f.id] = f;
    this.save();
  }

  getFrameAnalyses(evidenceId: string): FrameAnalysis[] {
    return Object.values(this.data.frame_analyses)
      .filter((f) => f.evidence_id === evidenceId)
      .sort((a, b) => a.frame_index - b.frame_index);
  }

  // Perceptual Hash Matches
  insertPerceptualHashMatch(p: PerceptualHashMatch): void {
    this.data.perceptual_hash_matches[p.id] = p;
    this.save();
  }

  getPerceptualHashMatches(evidenceId: string): PerceptualHashMatch[] {
    return Object.values(this.data.perceptual_hash_matches).filter(
      (p) => p.evidence_id === evidenceId && p.matched_evidence_id
    );
  }

  getAllPerceptualHashes(): PerceptualHashMatch[] {
    return Object.values(this.data.perceptual_hash_matches);
  }

  // Search Results
  insertSearchResult(s: SearchResult): void {
    this.data.search_results[s.id] = s;
    this.save();
  }

  getSearchResults(evidenceId: string): SearchResult[] {
    return Object.values(this.data.search_results)
      .filter((s) => s.evidence_id === evidenceId)
      .sort((a, b) => (a.indexed_at || '').localeCompare(b.indexed_at || ''));
  }

  // Resolved Sources
  insertResolvedSource(r: ResolvedSource): void {
    this.data.resolved_sources[r.id] = r;
    this.save();
  }

  getResolvedSource(evidenceId: string): ResolvedSource | undefined {
    return Object.values(this.data.resolved_sources).find((r) => r.evidence_id === evidenceId);
  }

  // Provenance Nodes & Edges
  setProvenanceGraph(evidenceId: string, nodes: ProvenanceNode[], edges: ProvenanceEdge[]): void {
    // Delete existing
    for (const key of Object.keys(this.data.provenance_nodes)) {
      if (this.data.provenance_nodes[key].evidence_id === evidenceId) {
        delete this.data.provenance_nodes[key];
      }
    }
    for (const key of Object.keys(this.data.provenance_edges)) {
      if (this.data.provenance_edges[key].evidence_id === evidenceId) {
        delete this.data.provenance_edges[key];
      }
    }

    for (const n of nodes) {
      this.data.provenance_nodes[n.id] = n;
    }
    for (const e of edges) {
      this.data.provenance_edges[e.id] = e;
    }
    this.save();
  }

  getProvenanceGraph(evidenceId: string): { nodes: ProvenanceNode[]; edges: ProvenanceEdge[] } {
    const nodes = Object.values(this.data.provenance_nodes).filter((n) => n.evidence_id === evidenceId);
    const edges = Object.values(this.data.provenance_edges).filter((e) => e.evidence_id === evidenceId);
    return { nodes, edges };
  }

  // Forensic Assessments
  insertForensicAssessment(a: ForensicAssessment): void {
    this.data.forensic_assessments[a.id] = a;
    this.save();
  }

  getLatestForensicAssessment(evidenceId: string): ForensicAssessment | undefined {
    const list = Object.values(this.data.forensic_assessments)
      .filter((a) => a.evidence_id === evidenceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list[0];
  }

  // Audit Events
  insertAuditEvent(e: AuditEvent): void {
    this.data.audit_events[e.id] = e;
    this.save();
  }

  getAuditEvents(evidenceId?: string): AuditEvent[] {
    const list = Object.values(this.data.audit_events);
    if (evidenceId) {
      return list
        .filter((e) => e.evidence_id === evidenceId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Forensic Reports
  insertForensicReport(r: ForensicReport): void {
    this.data.forensic_reports[r.id] = r;
    this.save();
  }

  getForensicReport(id: string): ForensicReport | undefined {
    return this.data.forensic_reports[id];
  }

  getForensicReportsByEvidence(evidenceId: string): ForensicReport[] {
    return Object.values(this.data.forensic_reports)
      .filter((r) => r.evidence_id === evidenceId)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }

  updateReportCertification(id: string, status: ForensicReport['certification_status'], date: string): void {
    if (this.data.forensic_reports[id]) {
      this.data.forensic_reports[id].certification_status = status;
      this.data.forensic_reports[id].certification_date = date;
      this.save();
    }
  }
}

export const db = new ForensicDatabase();
