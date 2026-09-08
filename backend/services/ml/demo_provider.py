from pathlib import Path
from backend.services.ml.provider import MLProvider, MLResult
from backend.config import PIPELINE_VERSION

class DemoFixtureProvider(MLProvider):
    """
    Deterministic fixture provider for automated unit testing and isolated demo environments.
    Only active when DEMO_MODE=True or MODEL_PROVIDER=demo.
    """

    @property
    def name(self) -> str:
        return "DemoFixtureProvider"

    @property
    def version(self) -> str:
        return "1.0.0-fixture"

    def is_available(self) -> bool:
        return True

    def analyze(self, image_path: Path, evidence_id: str, frame_index: int = 0) -> MLResult:
        # Deterministic score based on filename keywords or hash
        filename = image_path.name.lower()
        if "deepfake" in filename or "fake" in filename or "manipulated" in filename:
            score = 0.885
            band = "LIKELY_MANIPULATED"
            label = "MANIPULATED"
        elif "authentic" in filename or "real" in filename or "original" in filename:
            score = 0.124
            band = "LIKELY_AUTHENTIC"
            label = "AUTHENTIC"
        else:
            score = 0.450
            band = "INCONCLUSIVE"
            label = "INCONCLUSIVE"

        return MLResult(
            score=score,
            raw_logits=[-score, score],
            label=label,
            confidence_band=band,
            quality_flag="OK",
            pipeline_version=PIPELINE_VERSION,
            model_name=self.name,
            model_version=self.version,
            source="demo_fixture",
            processing_time_ms=15.0,
            device="cpu",
            runtime="python-simulated",
            status="SUCCEEDED"
        )

    def explain(self, image_path: Path, result: MLResult, evidence_id: str):
        from backend.services.ml.explainability import ExplainabilityService
        return ExplainabilityService.generate_heatmap(
            image_path=image_path,
            evidence_id=evidence_id,
            parent_sha256="demo_fixture_sha256"
        )
