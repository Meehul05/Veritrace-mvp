import uuid
from pathlib import Path
from PIL import Image
import numpy as np
import cv2
from backend.services.storage_service import StorageService
from backend.database import get_db

class ExplainabilityService:
    """
    M7 Explainability & Artifact Heatmap Visualization.
    Generates high-resolution spatial feature attribution / gradient-weighted heatmap
    blended with original image frames. Stored as derived artifact with parent_sha256.
    """

    @staticmethod
    def generate_heatmap(
        image_path: Path,
        evidence_id: str,
        parent_sha256: str,
        feature_weights: np.ndarray | None = None
    ) -> str:
        with Image.open(image_path) as pil_img:
            rgb_img = np.array(pil_img.convert("RGB"))

        h, w, _ = rgb_img.shape

        if feature_weights is not None and feature_weights.shape[:2] != (h, w):
            heatmap_norm = cv2.resize(feature_weights, (w, h), interpolation=cv2.INTER_CUBIC)
        else:
            # Generate spatial gradient / high-frequency artifact distribution map
            gray = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2GRAY)
            # Compute Laplacian high frequency residuals
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            abs_laplacian = np.abs(laplacian)
            blurred_residuals = cv2.GaussianBlur(abs_laplacian, (21, 21), 0)
            heatmap_norm = (blurred_residuals - blurred_residuals.min()) / (blurred_residuals.max() - blurred_residuals.min() + 1e-8)

        # Apply colormap
        heatmap_uint8 = np.uint8(255 * heatmap_norm)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Alpha blend: 0.55 original + 0.45 heatmap
        blended = cv2.addWeighted(rgb_img, 0.55, heatmap_colored, 0.45, 0)

        # Save to JPEG bytes
        success, buffer = cv2.imencode(".jpg", cv2.cvtColor(blended, cv2.COLOR_RGB2BGR), [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not success:
            raise RuntimeError("Failed to encode heatmap artifact.")

        artifact_id = str(uuid.uuid4())
        storage_ref = StorageService.store_derived_artifact(
            artifact_id=artifact_id,
            content=buffer.tobytes(),
            extension=".jpg"
        )

        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO derived_artifacts (
                    id, evidence_id, artifact_type, storage_ref,
                    created_by_module, created_at, parent_sha256
                ) VALUES (?, ?, 'heatmap', ?, 'ExplainabilityService', datetime('now'), ?)
                """,
                (artifact_id, evidence_id, storage_ref, parent_sha256)
            )

        return artifact_id
