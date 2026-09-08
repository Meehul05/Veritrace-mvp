import uuid
from datetime import datetime, timezone
from backend.database import get_db
from backend.services.audit_service import AuditService

class EarliestSourceService:
    """
    M10 Earliest Known Source Resolution Service.
    Resolves the earliest indexed public instance discovered through M9 search results.
    Ranks candidates by earliest indexed date.
    INVARIANT: Identifies earliest known indexed instance; does not claim to identify
    the true offline creator.
    """

    @staticmethod
    def resolve_earliest_source(evidence_id: str) -> dict:
        resolution_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            # Query all search results for this evidence ordered chronologically
            rows = conn.execute(
                """
                SELECT id, source, matched_url, indexed_at, similarity_score
                FROM search_results
                WHERE evidence_id = ? AND indexed_at IS NOT NULL
                ORDER BY indexed_at ASC
                """,
                (evidence_id,)
            ).fetchall()

            if not rows:
                # No search results recorded
                status = "NO_RESULTS"
                earliest_result_id = None
                earliest_indexed_at = None
                details = "No external index occurrences detected or reverse search not triggered."
            else:
                earliest = rows[0]
                status = "RESOLVED"
                earliest_result_id = earliest["id"]
                earliest_indexed_at = earliest["indexed_at"]
                details = f"Earliest indexed appearance found on {earliest['source']} at {earliest['indexed_at']}."

            conn.execute(
                """
                INSERT OR REPLACE INTO resolved_sources (
                    id, evidence_id, earliest_result_id, earliest_indexed_at,
                    resolution_status, resolved_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (resolution_id, evidence_id, earliest_result_id, earliest_indexed_at, status, now_iso)
            )

        AuditService.log_event(
            actor="System",
            module_name="EarliestSourceService",
            event_type="EARLIEST_SOURCE_RESOLVED",
            event_detail={
                "status": status,
                "earliest_result_id": earliest_result_id,
                "earliest_indexed_at": earliest_indexed_at
            },
            evidence_id=evidence_id
        )

        return {
            "id": resolution_id,
            "evidence_id": evidence_id,
            "earliest_result_id": earliest_result_id,
            "earliest_indexed_at": earliest_indexed_at,
            "resolution_status": status,
            "resolved_at": now_iso,
            "details": details
        }
