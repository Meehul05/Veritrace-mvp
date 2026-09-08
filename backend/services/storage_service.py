import os
import hashlib
from pathlib import Path
from backend.config import ORIGINAL_EVIDENCE_DIR, DERIVED_ARTIFACTS_DIR, REPORTS_DIR

class StorageService:
    """
    Evidence-custody storage layer adhering to strict write-once semantics
    for original evidence (Phase 1, M1+M2).
    """

    @staticmethod
    def write_once(evidence_id: str, content: bytes, original_sha256: str, extension: str) -> str:
        """
        Application-level write-once guarantee for original evidence.
        Overwrites are strictly forbidden. Stored bytes are re-hashed to guarantee integrity.
        """
        sanitized_ext = extension if extension.startswith(".") else f".{extension}"
        target_path = ORIGINAL_EVIDENCE_DIR / f"{evidence_id}_{original_sha256[:16]}{sanitized_ext}"

        if target_path.exists():
            raise FileExistsError(f"Evidence {evidence_id} already exists in storage. Overwrite forbidden.")

        # Write original bytes
        with open(target_path, "wb") as f:
            f.write(content)

        # Integrity verification: Recompute hash from persisted file
        with open(target_path, "rb") as f:
            persisted_bytes = f.read()
        persisted_hash = hashlib.sha256(persisted_bytes).hexdigest()

        if persisted_hash != original_sha256:
            # Delete corrupted write and raise error
            try:
                target_path.unlink()
            except Exception:
                pass
            raise ValueError("Integrity verification failed: stored bytes SHA-256 does not match original bytes SHA-256.")

        return str(target_path)

    @staticmethod
    def store_derived_artifact(artifact_id: str, content: bytes, extension: str) -> str:
        """
        Stores derived artifacts (frames, heatmaps, thumbnails).
        These remain traceable to parent evidence via parent_sha256.
        """
        sanitized_ext = extension if extension.startswith(".") else f".{extension}"
        target_path = DERIVED_ARTIFACTS_DIR / f"{artifact_id}{sanitized_ext}"
        with open(target_path, "wb") as f:
            f.write(content)
        return str(target_path)

    @staticmethod
    def store_report_package(report_id: str, pdf_bytes: bytes) -> str:
        """
        Stores generated Section 63 BSA report packages.
        """
        target_path = REPORTS_DIR / f"BSA_Section63_Report_{report_id}.pdf"
        with open(target_path, "wb") as f:
            f.write(pdf_bytes)
        return str(target_path)
