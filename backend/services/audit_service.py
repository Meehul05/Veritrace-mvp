import uuid
import json
from datetime import datetime, timezone
from backend.database import get_db

class AuditService:
    """
    M14 Audit Trail: Append-only ledger recording all module events and state transitions.
    Non-blocking to the forensic pipeline, but records full context.
    """

    @staticmethod
    def log_event(
        actor: str,
        module_name: str,
        event_type: str,
        event_detail: dict,
        evidence_id: str | None = None,
        investigation_id: str | None = None,
    ) -> str:
        event_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        detail_str = json.dumps(event_detail, default=str)

        try:
            with get_db() as conn:
                conn.execute(
                    """
                    INSERT INTO audit_events (
                        id, evidence_id, investigation_id, actor, module_name,
                        event_type, event_detail_json, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (event_id, evidence_id, investigation_id, actor, module_name, event_type, detail_str, now)
                )
        except Exception as e:
            # Audit logging error must not crash pipeline, but printed to stderr
            print(f"[AUDIT LOGGING ERROR] Failed to record event {event_type}: {e}")

        return event_id

    @staticmethod
    def get_trail_for_evidence(evidence_id: str) -> list[dict]:
        with get_db() as conn:
            rows = conn.execute(
                """
                SELECT * FROM audit_events
                WHERE evidence_id = ?
                ORDER BY timestamp ASC
                """,
                (evidence_id,)
            ).fetchall()
            return [dict(row) for row in rows]
