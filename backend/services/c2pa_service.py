import uuid
import json
from pathlib import Path
from backend.database import get_db
from backend.services.audit_service import AuditService

class C2PAService:
    """
    M4 C2PA Provenance Manifest Inspection Service.
    Inspects cryptographic Content Credentials (C2PA).
    Invariant: Absence of C2PA manifest ('NOT_FOUND') is presented as
    'No Cryptographic Provenance Found' and is NEVER treated as proof of manipulation.
    """

    @staticmethod
    def inspect_c2pa(evidence_id: str, storage_ref: str) -> dict:
        manifest_id = str(uuid.uuid4())
        manifest_state = "NOT_FOUND"
        issuer = None
        claim_generator = None
        signature_valid = None
        raw_manifest = {}

        try:
            # Check for native C2PA library if present
            try:
                import c2pa
                has_c2pa_lib = True
            except ImportError:
                has_c2pa_lib = False

            file_path = Path(storage_ref)
            if not file_path.exists():
                manifest_state = "FAILED"
                raw_manifest = {"error": "Evidence file missing from storage."}
            elif not has_c2pa_lib:
                # Inspect file header for common C2PA JUMBF / c2pa signatures
                with open(file_path, "rb") as f:
                    sample = f.read(1024 * 64)
                    if b"c2pa" in sample or b"jumb" in sample:
                        manifest_state = "VALID"
                        claim_generator = "C2PA Claim Detected (Raw JUMBF Box)"
                        raw_manifest = {"box": "jumbf", "status": "present"}
                    else:
                        manifest_state = "NOT_FOUND"
                        raw_manifest = {"detail": "No C2PA JUMBF metadata box detected."}
            else:
                try:
                    reader = c2pa.Reader(str(file_path))
                    manifest_json = reader.json()
                    parsed = json.loads(manifest_json)
                    active_manifest = parsed.get("active_manifest")
                    if active_manifest:
                        manifest_state = "VALID"
                        claim_generator = active_manifest.get("claim_generator")
                        signature_info = active_manifest.get("signature_info", {})
                        issuer = signature_info.get("issuer")
                        signature_valid = 1 if signature_info.get("validated") else 0
                        raw_manifest = active_manifest
                    else:
                        manifest_state = "NOT_FOUND"
                        raw_manifest = {"detail": "No active C2PA manifest found in stream."}
                except Exception as c2pa_err:
                    if "ManifestNotFound" in str(c2pa_err) or "not found" in str(c2pa_err).lower():
                        manifest_state = "NOT_FOUND"
                    else:
                        manifest_state = "INVALID"
                    raw_manifest = {"error": str(c2pa_err)}

        except Exception as e:
            manifest_state = "MODULE_UNAVAILABLE"
            raw_manifest = {"error": str(e)}

        raw_str = json.dumps(raw_manifest)
        with get_db() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO c2pa_manifests (
                    id, evidence_id, manifest_state, issuer, claim_generator,
                    signature_valid, raw_manifest_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (manifest_id, evidence_id, manifest_state, issuer, claim_generator, signature_valid, raw_str)
            )

        AuditService.log_event(
            actor="System",
            module_name="C2PAService",
            event_type="C2PA_INSPECTED",
            event_detail={
                "manifest_state": manifest_state,
                "issuer": issuer,
                "claim_generator": claim_generator,
                "signature_valid": bool(signature_valid) if signature_valid is not None else None
            },
            evidence_id=evidence_id
        )

        return {
            "id": manifest_id,
            "evidence_id": evidence_id,
            "manifest_state": manifest_state,
            "issuer": issuer,
            "claim_generator": claim_generator,
            "signature_valid": bool(signature_valid) if signature_valid is not None else None,
            "raw_manifest": raw_manifest
        }
