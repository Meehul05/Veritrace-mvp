import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

import { db } from './src/server/db';
import { HashingService } from './src/server/hashing';
import { StorageService } from './src/server/storage';
import { AuditService } from './src/server/audit';
import { MetadataService } from './src/server/metadata';
import { C2PAService } from './src/server/c2pa';
import { PHashService } from './src/server/phash';
import { MLInferenceService } from './src/server/ml';
import { ReverseSearchService } from './src/server/reverseSearch';
import { ProvenanceGraphService } from './src/server/provenance';
import { AggregationService } from './src/server/aggregation';
import { FindingsService } from './src/server/findings';
import { ReportService } from './src/server/report';
import { Evidence, AnalysisJob } from './src/server/types';

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage initialization
StorageService.initialize();

// Multer memory storage for direct byte hashing before disk write
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    pipeline_version: 'veritrace-v1.1.0-lock',
    engine: 'VeriTrace Forensic Engine (Node.js/TypeScript)',
    ml_provider: {
      name: MLInferenceService.MODEL_NAME,
      version: MLInferenceService.MODEL_VERSION,
      status: 'READY',
      device: 'cpu',
    },
    database: 'SQLite/JSON WAL Storage Active',
    bsa_section_63_compliant: true,
  });
});

// 2. Investigations
app.get('/api/v1/investigations', (req: Request, res: Response) => {
  const invs = db.getInvestigations();
  res.json({ investigations: invs });
});

app.post('/api/v1/investigations', (req: Request, res: Response) => {
  const { case_number, investigating_officer, jurisdiction } = req.body;
  const newInv = {
    id: `inv_${Date.now()}`,
    case_number: case_number || `BSA-CYBER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    investigating_officer: investigating_officer || 'Investigating Officer',
    jurisdiction: jurisdiction || 'Cyber Crime Division',
    created_at: new Date().toISOString(),
    status: 'ACTIVE' as const,
  };
  db.insertInvestigation(newInv);
  AuditService.logEvent(
    newInv.investigating_officer,
    'InvestigationService',
    'CASE_OPENED',
    { case_number: newInv.case_number },
    undefined,
    newInv.id
  );
  res.status(201).json({ investigation: newInv });
});

// 3. Evidence listing & detail
app.get('/api/v1/evidence', (req: Request, res: Response) => {
  const list = db.getAllEvidence();
  res.json({ evidence: list });
});

app.get('/api/v1/evidence/:id', (req: Request, res: Response) => {
  const ev = db.getEvidence(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evidence not found' });
  res.json({ evidence: ev });
});

// 4. Evidence Upload & Ingestion (M1 & M2)
app.post('/api/v1/evidence/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = req.file;
    const actor = req.body.actor || 'Investigating Officer';
    const investigationId = req.body.investigation_id || db.getInvestigations()[0]?.id || 'inv_default_001';

    // M1: Ingestion & Exact-byte SHA-256
    const exactSha256 = HashingService.computeSha256(file.buffer);
    const ext = path.extname(file.originalname) || '.bin';
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isVideo = file.mimetype.startsWith('video/');

    // M2: Write-once storage
    const storageRef = StorageService.writeOnceOriginal(
      evidenceId,
      file.buffer,
      exactSha256,
      ext
    );

    const evidence: Evidence = {
      id: evidenceId,
      investigation_id: investigationId,
      original_filename: file.originalname,
      sanitized_filename: sanitizedFilename,
      sha256: exactSha256,
      mime_type: file.mimetype,
      size_bytes: file.size,
      storage_ref: storageRef,
      ingested_at: new Date().toISOString(),
      media_type: isVideo ? 'video' : 'image',
    };

    db.insertEvidence(evidence);

    AuditService.logEvent(
      actor,
      'IngestionService',
      'EVIDENCE_INGESTED',
      {
        filename: evidence.original_filename,
        sha256: evidence.sha256,
        size_bytes: evidence.size_bytes,
        storage_ref: storageRef,
      },
      evidenceId,
      investigationId
    );

    // Track analysis jobs
    const modules = [
      'MetadataExtraction',
      'C2PAInspection',
      'PerceptualHashing',
      'MLInference',
      'ProvenanceGraph',
      'ForensicAggregation',
    ];

    for (const m of modules) {
      db.insertAnalysisJob({
        id: `job_${m}_${evidenceId}`,
        evidence_id: evidenceId,
        module_name: m,
        status: 'RUNNING',
        pipeline_version: 'veritrace-v1.1.0-lock',
        started_at: new Date().toISOString(),
      });
    }

    // Run Pipeline Synchronously for Immediate Forensic Feedback
    try {
      // M3: EXIF Metadata
      await MetadataService.extract(evidenceId, file.buffer, evidence.media_type);
      db.updateAnalysisJob(`job_MetadataExtraction_${evidenceId}`, 'OK', new Date().toISOString());
    } catch (err: any) {
      db.updateAnalysisJob(`job_MetadataExtraction_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
    }

    try {
      // M4: C2PA Inspection
      C2PAService.inspect(evidenceId, file.buffer);
      db.updateAnalysisJob(`job_C2PAInspection_${evidenceId}`, 'OK', new Date().toISOString());
    } catch (err: any) {
      db.updateAnalysisJob(`job_C2PAInspection_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
    }

    try {
      // M8: Perceptual Hashing
      PHashService.matchAgainstEvidence(evidenceId, file.buffer);
      db.updateAnalysisJob(`job_PerceptualHashing_${evidenceId}`, 'OK', new Date().toISOString());
    } catch (err: any) {
      db.updateAnalysisJob(`job_PerceptualHashing_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
    }

    try {
      // M6 & M7: ML Inference & Explainability Heatmaps
      await MLInferenceService.analyzeFrame(
        evidenceId,
        file.buffer,
        evidence.sha256,
        0,
        0,
        evidence.original_filename
      );
      db.updateAnalysisJob(`job_MLInference_${evidenceId}`, 'OK', new Date().toISOString());
    } catch (err: any) {
      db.updateAnalysisJob(`job_MLInference_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
    }

    try {
      // M11: Provenance Graph
      ProvenanceGraphService.buildGraph(evidenceId);
      db.updateAnalysisJob(`job_ProvenanceGraph_${evidenceId}`, 'OK', new Date().toISOString());
    } catch (err: any) {
      db.updateAnalysisJob(`job_ProvenanceGraph_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
    }

    try {
      // M12: Aggregation
      const assessment = AggregationService.aggregate(evidenceId);
      db.updateAnalysisJob(`job_ForensicAggregation_${evidenceId}`, 'OK', new Date().toISOString());

      return res.status(201).json({
        evidence,
        assessment,
        jobs: db.getAnalysisJobs(evidenceId),
      });
    } catch (err: any) {
      db.updateAnalysisJob(`job_ForensicAggregation_${evidenceId}`, 'FAILED', new Date().toISOString(), err.message);
      return res.status(201).json({
        evidence,
        jobs: db.getAnalysisJobs(evidenceId),
      });
    }
  } catch (err: any) {
    console.error('Ingestion error:', err);
    return res.status(500).json({ error: err.message || 'Evidence ingestion failed' });
  }
});

// 5. Analysis Status & Comprehensive Details
app.get('/api/v1/analysis/:evidence_id', (req: Request, res: Response) => {
  const evidenceId = req.params.evidence_id;
  const evidence = db.getEvidence(evidenceId);
  if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

  const metadata = db.getMetadataRecord(evidenceId);
  const c2pa = db.getC2PAManifest(evidenceId);
  const frames = db.getFrameAnalyses(evidenceId);
  const phashMatches = db.getPerceptualHashMatches(evidenceId);
  const searchResults = db.getSearchResults(evidenceId);
  const resolvedSource = db.getResolvedSource(evidenceId);
  const assessment = db.getLatestForensicAssessment(evidenceId);
  const jobs = db.getAnalysisJobs(evidenceId);
  const narrative = assessment ? FindingsService.generateNarrative(assessment) : null;

  res.json({
    evidence,
    jobs,
    metadata,
    c2pa,
    frames,
    phash_matches: phashMatches,
    search_results: searchResults,
    resolved_source: resolvedSource,
    assessment,
    narrative,
  });
});

// 5b. Interactive Re-Analysis (Select Engine / Calibrate Sensitivity)
app.post('/api/v1/evidence/:id/reanalyze', async (req: Request, res: Response) => {
  const evidenceId = req.params.id;
  const { engine = 'ensemble', threshold = 0.50, actor = 'Investigating Officer' } = req.body;

  const evidence = db.getEvidence(evidenceId);
  if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

  try {
    const fileBuffer = StorageService.readArtifact(evidence.storage_ref);

    const frameAnalysis = await MLInferenceService.analyzeFrame(
      evidenceId,
      fileBuffer,
      evidence.sha256,
      0,
      0,
      evidence.original_filename,
      { engine, threshold: Number(threshold) }
    );

    const assessment = AggregationService.aggregate(evidenceId);

    const narrative = FindingsService.generateNarrative(assessment);

    AuditService.logEvent(
      actor,
      'API',
      'EVIDENCE_REANALYZED',
      {
        evidence_id: evidenceId,
        engine,
        threshold,
        new_score: frameAnalysis.ml_score,
        new_verdict: assessment.verdict,
        forensic_justification: frameAnalysis.forensic_justification,
      },
      evidenceId
    );

    res.json({
      success: true,
      frame: frameAnalysis,
      assessment,
      narrative,
    });
  } catch (err: any) {
    console.error('[REANALYZE_ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to reanalyze evidence' });
  }
});

// 6. Provenance Graph DAG
app.get('/api/v1/provenance/:evidence_id', (req: Request, res: Response) => {
  const evidenceId = req.params.evidence_id;
  let graph = db.getProvenanceGraph(evidenceId);
  if (graph.nodes.length === 0) {
    // Attempt building if not built yet
    try {
      graph = ProvenanceGraphService.buildGraph(evidenceId);
    } catch {}
  }
  res.json(graph);
});

// 7. M9 Reverse Search (STRICTLY EXPLICIT INVESTIGATOR TRIGGER)
app.post('/api/v1/reverse-search', async (req: Request, res: Response) => {
  const { evidence_id, actor, query } = req.body;
  if (!evidence_id) return res.status(400).json({ error: 'evidence_id is required' });

  try {
    const outcome = await ReverseSearchService.triggerSearch(
      evidence_id,
      actor || 'Investigating Officer',
      query
    );

    // Rebuild graph and refresh assessment
    ProvenanceGraphService.buildGraph(evidence_id);
    const updatedAssessment = AggregationService.aggregate(evidence_id);

    res.json({
      results: outcome.results,
      earliest_source: outcome.earliestSource,
      assessment: updatedAssessment,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Audit Trail (M14)
app.get('/api/v1/audit/:evidence_id?', (req: Request, res: Response) => {
  const events = AuditService.getAuditTrail(req.params.evidence_id);
  res.json({ events });
});

// 9. Generate Section 63 BSA Report (M15)
app.post('/api/v1/reports/bsa-section-63', async (req: Request, res: Response) => {
  const { evidence_id, investigation_id, examiner_name, actor } = req.body;
  if (!evidence_id) return res.status(400).json({ error: 'evidence_id is required' });

  try {
    const report = await ReportService.generateBsaReport(
      evidence_id,
      investigation_id || db.getInvestigations()[0]?.id || 'inv_default_001',
      examiner_name || 'Inspector V. Sharma',
      actor || 'Investigating Officer'
    );
    res.status(201).json({ report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Download Report PDF
app.get('/api/v1/reports/:id/download', (req: Request, res: Response) => {
  const report = db.getForensicReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  if (!fs.existsSync(report.storage_ref)) {
    return res.status(404).json({ error: 'Report file missing from storage' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="BSA_Section63_${report.id}.pdf"`);
  fs.createReadStream(report.storage_ref).pipe(res);
});

// 11. Human Certification of Report
app.post('/api/v1/reports/:id/certify', (req: Request, res: Response) => {
  const { examiner_name } = req.body;
  const report = db.getForensicReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const date = new Date().toISOString();
  db.updateReportCertification(req.params.id, 'CERTIFIED', date);

  AuditService.logEvent(
    examiner_name || 'Forensic Examiner',
    'ReportService',
    'BSA_REPORT_CERTIFIED',
    {
      report_id: req.params.id,
      report_hash: report.report_hash,
      certification_date: date,
    },
    report.evidence_id,
    report.investigation_id
  );

  res.json({ success: true, report: db.getForensicReport(req.params.id) });
});

// 12. Artifact image serving
app.get('/api/v1/artifacts/:id', (req: Request, res: Response) => {
  const artifact = db.getDerivedArtifact(req.params.id);
  if (!artifact) return res.status(404).json({ error: 'Artifact not found' });

  if (!fs.existsSync(artifact.storage_ref)) {
    return res.status(404).json({ error: 'Artifact file missing' });
  }

  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(artifact.storage_ref).pipe(res);
});

// 13. Evidence original file serving
app.get('/api/v1/evidence/:id/file', (req: Request, res: Response) => {
  const evidence = db.getEvidence(req.params.id);
  if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

  if (!fs.existsSync(evidence.storage_ref)) {
    return res.status(404).json({ error: 'Evidence file missing from storage' });
  }

  res.setHeader('Content-Type', evidence.mime_type || 'image/jpeg');
  fs.createReadStream(evidence.storage_ref).pipe(res);
});

// ==========================================
// VITE MIDDLEWARE (DEV) & STATIC (PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VERITRACE] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
