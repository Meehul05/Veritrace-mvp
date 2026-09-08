import uuid
import json
from pathlib import Path
from PIL import Image, ExifTags
import cv2
from backend.database import get_db
from backend.services.audit_service import AuditService

class MetadataService:
    """
    M3 Metadata & EXIF Extraction Service.
    Extracts structural, technical, and cryptographic camera/device metadata.
    Fails independently without crashing parent pipeline.
    """

    @staticmethod
    def extract_metadata(evidence_id: str, storage_ref: str, media_type: str) -> dict:
        record_id = str(uuid.uuid4())
        camera_model = None
        gps_present = 0
        captured_at = None
        extraction_status = "OK"
        exif_data = {}

        try:
            file_path = Path(storage_ref)
            if not file_path.exists():
                raise FileNotFoundError(f"Evidence file {storage_ref} not found on disk.")

            if media_type == "image":
                with Image.open(file_path) as img:
                    exif_data["format"] = img.format
                    exif_data["mode"] = img.mode
                    exif_data["width"] = img.width
                    exif_data["height"] = img.height

                    raw_exif = img.getexif()
                    if raw_exif:
                        for tag_id, value in raw_exif.items():
                            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                            # Convert non-serializable objects to string
                            if isinstance(value, (bytes, bytearray)):
                                try:
                                    value = value.decode("utf-8", errors="replace")
                                except Exception:
                                    value = str(value[:20])
                            exif_data[tag_name] = str(value)

                        # Check camera / make
                        make = exif_data.get("Make", "")
                        model = exif_data.get("Model", "")
                        if make or model:
                            camera_model = f"{make} {model}".strip()

                        captured_at = exif_data.get("DateTimeOriginal") or exif_data.get("DateTime")
                        if "GPSInfo" in exif_data:
                            gps_present = 1

            elif media_type == "video":
                cap = cv2.VideoCapture(str(file_path))
                if cap.isOpened():
                    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
                    duration_s = (frame_count / fps) if fps > 0 else 0
                    fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
                    fourcc_str = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

                    exif_data = {
                        "width": width,
                        "height": height,
                        "fps": round(fps, 2),
                        "frame_count": frame_count,
                        "duration_seconds": round(duration_s, 2),
                        "codec": fourcc_str.strip() or "H264/MP4"
                    }
                    cap.release()
                else:
                    extraction_status = "PARTIAL"
                    exif_data["error"] = "Unable to open video stream."

        except Exception as e:
            extraction_status = "FAILED"
            exif_data["error"] = str(e)

        # Store in database
        exif_json_str = json.dumps(exif_data)
        with get_db() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO metadata_records (
                    id, evidence_id, exif_json, camera_model, gps_present,
                    captured_at, extraction_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (record_id, evidence_id, exif_json_str, camera_model, gps_present, captured_at, extraction_status)
            )

        AuditService.log_event(
            actor="System",
            module_name="MetadataService",
            event_type="METADATA_EXTRACTED",
            event_detail={
                "status": extraction_status,
                "camera_model": camera_model,
                "gps_present": bool(gps_present),
                "fields_extracted": len(exif_data)
            },
            evidence_id=evidence_id
        )

        return {
            "id": record_id,
            "evidence_id": evidence_id,
            "camera_model": camera_model,
            "gps_present": bool(gps_present),
            "captured_at": captured_at,
            "extraction_status": extraction_status,
            "exif": exif_data
        }
