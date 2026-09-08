import sqlite3
import json
from contextlib import contextmanager
from backend.config import DB_PATH

DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS investigations (
            id TEXT PRIMARY KEY,
            case_number TEXT NOT NULL UNIQUE,
            investigating_officer TEXT NOT NULL,
            jurisdiction TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY,
            investigation_id TEXT NOT NULL REFERENCES investigations(id),
            original_filename TEXT NOT NULL,
            sanitized_filename TEXT NOT NULL,
            sha256 TEXT NOT NULL UNIQUE,
            mime_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            storage_ref TEXT NOT NULL,
            ingested_at TEXT NOT NULL,
            media_type TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_evidence_sha256 ON evidence(sha256);
        CREATE INDEX IF NOT EXISTS idx_evidence_investigation ON evidence(investigation_id);

        CREATE TABLE IF NOT EXISTS derived_artifacts (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            artifact_type TEXT NOT NULL,
            storage_ref TEXT NOT NULL,
            created_by_module TEXT NOT NULL,
            created_at TEXT NOT NULL,
            parent_sha256 TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analysis_jobs (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            module_name TEXT NOT NULL,
            status TEXT NOT NULL,
            pipeline_version TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            error_detail TEXT
        );

        CREATE TABLE IF NOT EXISTS metadata_records (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            exif_json TEXT,
            camera_model TEXT,
            gps_present INTEGER NOT NULL DEFAULT 0,
            captured_at TEXT,
            extraction_status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS c2pa_manifests (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            manifest_state TEXT NOT NULL,
            issuer TEXT,
            claim_generator TEXT,
            signature_valid INTEGER,
            raw_manifest_json TEXT
        );

        CREATE TABLE IF NOT EXISTS frame_analyses (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            derived_artifact_id TEXT REFERENCES derived_artifacts(id),
            frame_index INTEGER NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            ml_score REAL NOT NULL,
            ml_label TEXT NOT NULL,
            confidence_band TEXT NOT NULL,
            pipeline_version TEXT NOT NULL,
            model_name TEXT NOT NULL,
            model_version TEXT NOT NULL,
            quality_flag TEXT NOT NULL,
            heatmap_artifact_id TEXT REFERENCES derived_artifacts(id)
        );

        CREATE TABLE IF NOT EXISTS perceptual_hash_matches (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            derived_artifact_id TEXT REFERENCES derived_artifacts(id),
            matched_evidence_id TEXT REFERENCES evidence(id),
            phash_value TEXT NOT NULL,
            hamming_distance INTEGER NOT NULL,
            matched_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS search_results (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            source TEXT NOT NULL,
            matched_url TEXT NOT NULL,
            indexed_at TEXT,
            similarity_score REAL,
            retrieved_at TEXT NOT NULL,
            triggered_by TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS resolved_sources (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            earliest_result_id TEXT REFERENCES search_results(id),
            earliest_indexed_at TEXT,
            resolution_status TEXT NOT NULL,
            resolved_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS provenance_nodes (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            node_type TEXT NOT NULL,
            label TEXT NOT NULL,
            metadata_json TEXT
        );

        CREATE TABLE IF NOT EXISTS provenance_edges (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            source_node_id TEXT NOT NULL,
            target_node_id TEXT NOT NULL,
            relationship TEXT NOT NULL,
            confidence REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS forensic_assessments (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            pipeline_version TEXT NOT NULL,
            overall_status TEXT NOT NULL,
            overall_confidence REAL,
            assessment_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_forensic_assessments_ev ON forensic_assessments(evidence_id);

        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            evidence_id TEXT REFERENCES evidence(id),
            investigation_id TEXT REFERENCES investigations(id),
            actor TEXT NOT NULL,
            module_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_detail_json TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS forensic_reports (
            id TEXT PRIMARY KEY,
            evidence_id TEXT NOT NULL REFERENCES evidence(id),
            investigation_id TEXT NOT NULL REFERENCES investigations(id),
            forensic_assessment_id TEXT NOT NULL REFERENCES forensic_assessments(id),
            generated_at TEXT NOT NULL,
            generated_by TEXT NOT NULL,
            storage_ref TEXT NOT NULL,
            report_hash TEXT NOT NULL,
            examiner_name TEXT NOT NULL,
            examiner_signature_ref TEXT,
            device_owner_signature_ref TEXT,
            certification_status TEXT NOT NULL
        );
        """)
