from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

@dataclass
class MLResult:
    score: float  # Probability of manipulation in [0.0, 1.0]
    raw_logits: list[float]  # [logit_real, logit_fake]
    label: str  # "LIKELY_AUTHENTIC" or "LIKELY_MANIPULATED" or "INCONCLUSIVE"
    confidence_band: str  # "LIKELY_MANIPULATED", "SUSPICIOUS", "LIKELY_AUTHENTIC", "INCONCLUSIVE"
    quality_flag: str  # "OK" or "HIGH_DEGRADATION"
    pipeline_version: str
    model_name: str
    model_version: str
    source: str  # "real" or "demo_fixture"
    processing_time_ms: float
    device: str
    runtime: str
    status: str = "SUCCEEDED"
    error_message: Optional[str] = None
    heatmap_artifact_id: Optional[str] = None

class MLProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def analyze(self, image_path: Path, evidence_id: str, frame_index: int = 0) -> MLResult:
        pass

    @abstractmethod
    def explain(self, image_path: Path, result: MLResult, evidence_id: str) -> Optional[str]:
        pass
