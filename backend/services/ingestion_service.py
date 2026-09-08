import uuid
import re
from datetime import datetime, timezone
from pathlib import Path
from backend.config import MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES
from backend.database import get_db
from backend.services.hashing_service import HashingService
from backend.services.storage_service import StorageService
from backend.services.audit_service import AuditService

class IngestionService:
    """
    M1 + M2 Evidence Ingestion & Hashing Service.
    Acts as a single blocking transaction: bytes are validated, SHA-256 is computed
    from the exact byte stream, persisted with write-once semantics, and verified.
    """

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        name = Path(filename).name
        # Keep only alphanumeric, dashes, underscores, and dots
        sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
        return sanitized or "evidence_file"

    @staticmethod
    def ingest_evidence(
        investigation_id: str,
        original_filename: str,
        content: bytes,
        mime_type: str,
        actor: str = "Investigating Officer"
    ) -> dict:
        # 1. Validation: Size
        size_bytes = len(content)
        if size_bytes > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Payload exceeds maximum allowed size of 20MB (received {size_bytes / (1024*1024):.2f}MB).")
        if size_bytes == 0:
            raise ValueError("Uploaded evidence payload is empty (0 bytes).")

        # 2. Validation: MIME Type
        normalized_mime = mime_type.lower().split(";")[0].strip()
        if normalized_mime not in ALLOWED_MIME_TYPES:
            raise ValueError(f"MIME type '{normalized_mime}' is not permitted. Allowed: {list(ALLOWED_MIME_TYPES.keys())}")

        extension = ALLOWED_MIME_TYPES[normalized_mime]
        media_type = "video" if normalized_mime.startswith("video/") else "image"
        sanitized_filename = IngestionService.sanitize_filename(original_filename)

        # 3. Exact-byte SHA-256 computation (M2)
        sha256_hash = HashingService.compute_sha256(content)
        evidence_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # Check for existing duplicate SHA-256 in database
        with get_db() as conn:
            existing = conn.execute(
                "SELECT id, investigation_id, original_filename FROM evidence WHERE sha256 = ?",
                (sha256_hash,)
            ).fetchone()
            if existing:
                # Still log duplicate ingestion event
                AuditService.log_event(
                    actor=actor,
                    module_name="Ingestion",
                    event_type="DUPLICATE_EVIDENCE_DETECTED",
                    event_detail={
                        "incoming_filename": original_filename,
                        "existing_evidence_id": existing["id"],
                        "sha256": sha256_hash
                    },
                    evidence_id=existing["id"],
                    investigation_id=investigation_id
                )

        # 4. Write-once storage persistence & write verification
        storage_ref = StorageService.write_once(
            evidence_id=evidence_id,
            content=content,
            original_sha256=sha256_hash,
            extension=extension
        )

        # 5. Insert Evidence record in DB
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO evidence (
                    id, investigation_id, original_filename, sanitized_filename,
                    sha256, mime_type, size_bytes, storage_ref, ingested_at, media_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence_id, investigation_id, original_filename, sanitized_filename,
                    sha256_hash, normalized_mime, size_bytes, storage_ref, now_iso, media_type
                )
            )

        # 6. Audit Trail Logging (M14)
        AuditService.log_event(
            actor=actor,
            module_name="Ingestion",
            event_type="EVIDENCE_INGESTED",
            event_detail={
                "original_filename": original_filename,
                "sanitized_filename": sanitized_filename,
                "sha256": sha256_hash,
                "mime_type": normalized_mime,
                "size_bytes": size_bytes,
                "storage_ref": storage_ref,
                "media_type": media_type
            },
            evidence_id=evidence_id,
            investigation_id=investigation_id
        )

        return {
            "evidence_id": evidence_id,
            "investigation_id": investigation_id,
            "original_filename": original_filename,
            "sanitized_filename": sanitized_filename,
            "sha256": sha256_hash,
            "mime_type": normalized_mime,
            "size_bytes": size_bytes,
            "storage_ref": storage_ref,
            "ingested_at": now_iso,
            "media_type": media_type
        }
