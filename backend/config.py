import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "data" / "storage"
ORIGINAL_EVIDENCE_DIR = STORAGE_DIR / "original"
DERIVED_ARTIFACTS_DIR = STORAGE_DIR / "artifacts"
REPORTS_DIR = STORAGE_DIR / "reports"
DB_PATH = BASE_DIR / "data" / "veritrace.db"
MODELS_DIR = BASE_DIR / "models"

# Ensure runtime directories exist
ORIGINAL_EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
DERIVED_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Forensic configuration
PIPELINE_VERSION = "veritrace-v1.1.0-lock"
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB strictly enforced
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}

# Model settings
MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "gend")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
MAX_VIDEO_FRAMES = int(os.getenv("MAX_VIDEO_FRAMES", "8"))
INFERENCE_TIMEOUT_SECONDS = int(os.getenv("INFERENCE_TIMEOUT_SECONDS", "30"))
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "")
