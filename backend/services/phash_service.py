import uuid
from pathlib import Path
from PIL import Image
import imagehash
from backend.database import get_db
from backend.services.audit_service import AuditService

class PHashService:
    """
    M8 Perceptual Hashing & Similarity Match Service.
    Computes 64-bit perceptual hash (pHash) on media.
    Matches against prior evidence in the investigation repository using strict Hamming distance.
    Hamming distance <= 10 flags near-duplicate / transcode variant.
    """

    @staticmethod
    def compute_phash(image_path: Path) -> str:
        with Image.open(image_path) as img:
            h = imagehash.phash(img)
            return str(h)

    @staticmethod
    def match_against_evidence(
        evidence_id: str,
        image_path: Path,
        derived_artifact_id: str | None = None
    ) -> list[dict]:
        phash_str = PHashService.compute_phash(image_path)
        current_hash = imagehash.hex_to_hash(phash_str)

        matches = []
        with get_db() as conn:
            # Fetch all existing phash records for comparison
            rows = conn.execute(
                """
                SELECT p.evidence_id, p.phash_value, e.original_filename, e.sha256
                FROM perceptual_hash_matches p
                JOIN evidence e ON e.id = p.evidence_id
                WHERE p.evidence_id != ?
                GROUP BY p.evidence_id
                """,
                (evidence_id,)
            ).fetchall()

            for row in rows:
                other_phash = imagehash.hex_to_hash(row["phash_value"])
                distance = current_hash - other_phash  # Exact Hamming distance
                if distance <= 12:  # Threshold for perceptual match
                    match_id = str(uuid.uuid4())
                    matches.append({
                        "id": match_id,
                        "matched_evidence_id": row["evidence_id"],
                        "matched_filename": row["original_filename"],
                        "matched_sha256": row["sha256"],
                        "phash_value": phash_str,
                        "hamming_distance": distance
                    })

            # Record this evidence's phash
            record_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO perceptual_hash_matches (
                    id, evidence_id, derived_artifact_id, matched_evidence_id,
                    phash_value, hamming_distance, matched_at
                ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
                """,
                (
                    record_id, evidence_id, derived_artifact_id,
                    matches[0]["matched_evidence_id"] if matches else None,
                    phash_str
                )
            )

        AuditService.log_event(
            actor="System",
            module_name="PHashService",
            event_type="PHASH_COMPUTED",
            event_detail={
                "phash": phash_str,
                "matches_found": len(matches),
                "closest_distance": min([m["hamming_distance"] for m in matches]) if matches else None
            },
            evidence_id=evidence_id
        )

        return matches
