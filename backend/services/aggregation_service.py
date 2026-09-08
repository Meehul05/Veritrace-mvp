import uuid
import json
from datetime import datetime, timezone
from backend.config import PIPELINE_VERSION
from backend.database import get_db
from backend.services.audit_service import AuditService

class AggregationService:
    """
    M12 Fan-in Aggregation Engine.
    Synthesizes outputs across M1-M11 into a versioned `ForensicAssessment`.
    INVARIANTS:
    - Never overwrites existing ForensicAssessment rows; always creates new versioned record.
    - If any upstream module is degraded or unavailable, overall_status reflects PARTIAL or INCONCLUSIVE.
    - Never invents scores.
    """

    @staticmethod
    def aggregate_assessment(evidence_id: str) -> dict:
        assessment_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            ev = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
            if not ev:
                raise ValueError(f"Evidence {evidence_id} not found.")

            meta = conn.execute("SELECT * FROM metadata_records WHERE evidence_id = ?", (evidence_id,)).fetchone()
            c2pa = conn.execute("SELECT * FROM c2pa_manifests WHERE evidence_id = ?", (evidence_id,)).fetchone()
            frames = conn.execute(
                "SELECT * FROM frame_analyses WHERE evidence_id = ? ORDER BY frame_index ASC",
                (evidence_id,)
            ).fetchall()
            p_matches = conn.execute(
                "SELECT * FROM perceptual_hash_matches WHERE evidence_id = ?", (evidence_id,)
            ).fetchall()
            searches = conn.execute(
                "SELECT * FROM search_results WHERE evidence_id = ?", (evidence_id,)
            ).fetchall()
            res_source = conn.execute(
                "SELECT * FROM resolved_sources WHERE evidence_id = ?", (evidence_id,)
            ).fetchone()
            jobs = conn.execute(
                "SELECT * FROM analysis_jobs WHERE evidence_id = ?", (evidence_id,)
            ).fetchall()

            # Analyze statuses
            module_breakdown = {}
            for j in jobs:
                module_breakdown[j["module_name"]] = {
                    "status": j["status"],
                    "error": j["error_detail"]
                }

            # ML status evaluation
            ml_scores = [f["ml_score"] for f in frames if f["quality_flag"] == "OK"]
            any_degraded = any(f["quality_flag"] != "OK" for f in frames)
            has_inconclusive_frame = any(f["confidence_band"] == "INCONCLUSIVE" for f in frames)

            if not frames:
                overall_status = "PARTIAL"
                overall_confidence = 0.0
                verdict = "INCONCLUSIVE (NO FRAMES ANALYZED)"
            elif any(j["status"] == "UNAVAILABLE" for j in jobs if j["module_name"] == "MLInference"):
                overall_status = "PARTIAL"
                overall_confidence = 0.0
                verdict = "INCONCLUSIVE (ML MODEL UNAVAILABLE)"
            elif any_degraded or has_inconclusive_frame:
                overall_status = "INCONCLUSIVE"
                avg_score = sum(ml_scores) / len(ml_scores) if ml_scores else 0.5
                overall_confidence = avg_score
                verdict = "INCONCLUSIVE (QUALITY DEGRADED OR BOUNDARY SIGNAL)"
            else:
                overall_status = "COMPLETE"
                avg_score = sum(ml_scores) / len(ml_scores) if ml_scores else 0.0
                overall_confidence = avg_score
                if avg_score >= 0.75:
                    verdict = "LIKELY_MANIPULATED"
                elif avg_score <= 0.30:
                    verdict = "LIKELY_AUTHENTIC"
                else:
                    verdict = "INCONCLUSIVE"

            assessment_data = {
                "assessment_id": assessment_id,
                "evidence_id": evidence_id,
                "pipeline_version": PIPELINE_VERSION,
                "overall_status": overall_status,
                "verdict": verdict,
                "overall_confidence": round(overall_confidence, 4),
                "created_at": now_iso,
                "evidence_metadata": {
                    "filename": ev["original_filename"],
                    "sha256": ev["sha256"],
                    "size_bytes": ev["size_bytes"],
                    "mime_type": ev["mime_type"],
                    "media_type": ev["media_type"]
                },
                "metadata_status": meta["extraction_status"] if meta else "NOT_RUN",
                "camera_model": meta["camera_model"] if meta else None,
                "gps_present": bool(meta["gps_present"]) if meta else False,
                "c2pa_state": c2pa["manifest_state"] if c2pa else "NOT_FOUND",
                "c2pa_issuer": c2pa["issuer"] if c2pa else None,
                "frames_count": len(frames),
                "frame_analyses": [
                    {
                        "frame_index": f["frame_index"],
                        "timestamp_ms": f["timestamp_ms"],
                        "ml_score": f["ml_score"],
                        "ml_label": f["ml_label"],
                        "confidence_band": f["confidence_band"],
                        "quality_flag": f["quality_flag"],
                        "model_name": f["model_name"]
                    }
                    for f in frames
                ],
                "phash_matches_count": len(p_matches),
                "search_results_count": len(searches),
                "resolved_earliest_source": res_source["earliest_indexed_at"] if res_source else None,
                "module_breakdown": module_breakdown
            }

            conn.execute(
                """
                INSERT INTO forensic_assessments (
                    id, evidence_id, pipeline_version, overall_status,
                    overall_confidence, assessment_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    assessment_id, evidence_id, PIPELINE_VERSION, overall_status,
                    overall_confidence, json.dumps(assessment_data), now_iso
                )
            )

        AuditService.log_event(
            actor="System",
            module_name="AggregationService",
            event_type="ASSESSMENT_AGGREGATED",
            event_detail={
                "assessment_id": assessment_id,
                "overall_status": overall_status,
                "verdict": verdict,
                "confidence": overall_confidence
            },
            evidence_id=evidence_id
        )

        return assessment_data
