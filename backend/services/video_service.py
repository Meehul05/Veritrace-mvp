import uuid
from pathlib import Path
import cv2
from backend.config import MAX_VIDEO_FRAMES
from backend.database import get_db
from backend.services.storage_service import StorageService
from backend.services.audit_service import AuditService

class VideoService:
    """
    M5 Video Processing Service.
    Extracts a capped set of representative frames with millisecond timestamps.
    Each extracted frame is stored as a distinct derived artifact retaining
    provenance traceability via parent_sha256.
    """

    @staticmethod
    def extract_representative_frames(evidence_id: str, storage_ref: str, parent_sha256: str) -> list[dict]:
        file_path = Path(storage_ref)
        if not file_path.exists():
            raise FileNotFoundError(f"Video file {storage_ref} not found on disk.")

        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video container at {storage_ref}.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)

        if total_frames <= 0:
            cap.release()
            return []

        # Enforce representative sampling cap
        sample_count = min(MAX_VIDEO_FRAMES, max(1, total_frames))
        step = max(1, total_frames // sample_count)
        frame_indices = [i * step for i in range(sample_count) if i * step < total_frames]

        extracted_frames = []
        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            success, frame_bgr = cap.read()
            if not success or frame_bgr is None:
                continue

            timestamp_ms = int((idx / fps) * 1000) if fps > 0 else idx * 40

            # Encode frame as JPEG byte stream
            success, buffer = cv2.imencode(".jpg", frame_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
            if not success:
                continue

            frame_bytes = buffer.tobytes()
            artifact_id = str(uuid.uuid4())

            # Store as derived artifact
            artifact_storage_ref = StorageService.store_derived_artifact(
                artifact_id=artifact_id,
                content=frame_bytes,
                extension=".jpg"
            )

            # Insert into derived_artifacts table
            with get_db() as conn:
                conn.execute(
                    """
                    INSERT INTO derived_artifacts (
                        id, evidence_id, artifact_type, storage_ref,
                        created_by_module, created_at, parent_sha256
                    ) VALUES (?, ?, 'frame', ?, 'VideoService', datetime('now'), ?)
                    """,
                    (artifact_id, evidence_id, artifact_storage_ref, parent_sha256)
                )

            extracted_frames.append({
                "artifact_id": artifact_id,
                "frame_index": idx,
                "timestamp_ms": timestamp_ms,
                "storage_ref": artifact_storage_ref,
                "parent_sha256": parent_sha256
            })

        cap.release()

        AuditService.log_event(
            actor="System",
            module_name="VideoService",
            event_type="FRAMES_EXTRACTED",
            event_detail={
                "total_frames_in_video": total_frames,
                "frames_sampled": len(extracted_frames),
                "fps": fps
            },
            evidence_id=evidence_id
        )

        return extracted_frames
