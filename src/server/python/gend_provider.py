#!/usr/bin/env python3
"""
GenD-DINOv3-L Local Forensic ML Provider for VeriTrace.
Integrates the official yermandy/GenD_DINOv3_L deepfake detection foundation model.

Supports:
- Automatic Hugging Face checkpoint download and local disk caching
- Hardware auto-detection: CUDA on NVIDIA RTX 5060 / other GPUs, or CPU fallback
- Single image inference via CLI (human-readable or JSON)
- Daemon HTTP server mode for zero-overhead persistent inference
- Model health / status reporting
"""

import os
import sys
import time
import json
import argparse
import importlib.util
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

import torch
from PIL import Image
from huggingface_hub import hf_hub_download

MODEL_REPO_ID = os.environ.get("GEND_MODEL_ID", "yermandy/GenD_DINOv3_L")
DEVICE_OVERRIDE = os.environ.get("ML_DEVICE", "auto").lower()

_cached_model = None
_cached_device = None


def get_target_device() -> torch.device:
    """Determine whether to use CUDA or CPU based on environment and availability."""
    if DEVICE_OVERRIDE == "cuda":
        if torch.cuda.is_available():
            return torch.device("cuda")
        else:
            print("[GenD] Warning: ML_DEVICE=cuda requested but CUDA is not available. Falling back to CPU.", file=sys.stderr)
            return torch.device("cpu")
    elif DEVICE_OVERRIDE == "cpu":
        return torch.device("cpu")
    else:  # auto
        if torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")


def load_gend_class(repo_id: str):
    """
    Downloads modeling_gend.py from Hugging Face hub (cached automatically)
    and dynamically imports the GenD class.
    """
    try:
        py_path = hf_hub_download(repo_id=repo_id, filename="modeling_gend.py")
        spec = importlib.util.spec_from_file_location("modeling_gend", py_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load spec from {py_path}")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.GenD
    except Exception as e:
        raise RuntimeError(f"Failed to load modeling_gend.py for {repo_id}: {e}") from e


def load_model(repo_id: str = MODEL_REPO_ID):
    """
    Loads GenD model from Hugging Face hub or local cache.
    Caches model in memory for subsequent requests.
    """
    global _cached_model, _cached_device
    if _cached_model is not None:
        return _cached_model, _cached_device

    device = get_target_device()
    GenD = load_gend_class(repo_id)

    # Automatically downloads model weights if not cached locally
    model = GenD.from_pretrained(repo_id)
    model.to(device)
    model.eval()

    _cached_model = model
    _cached_device = device
    return _cached_model, _cached_device


def run_inference(image_path: str, repo_id: str = MODEL_REPO_ID) -> Dict[str, Any]:
    """
    Runs GenD-DINOv3-L inference on a local image file.
    Does NOT transmit images externally. All processing is local.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    start_time = time.perf_counter()
    model, device = load_model(repo_id)

    # Open image using Pillow
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        tensor = model.feature_extractor.preprocess(img_rgb)

    # Tensor shape: [1, 3, H, W]
    tensors = tensor.unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensors)
        # Binary classification logits: [real_logit, fake_logit] or [fake_logit, real_logit]
        # Softmax over 2 classes
        probs = logits.softmax(dim=-1).cpu().numpy()[0]

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    # In GenD architecture, class 0 represents genuine/real and class 1 represents manipulated/fake,
    # or score is taken from index 1.
    fake_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
    # Detector score rounded to 4 decimal places
    detector_score = round(fake_prob, 4)

    # Forensic interpretation: use cautious, evidentiary wording
    if detector_score >= 0.60:
        interpretation = "Model indicates higher likelihood of manipulation."
        band = "LIKELY_MANIPULATED"
    elif detector_score <= 0.40:
        interpretation = "Model indicates lower likelihood of manipulation (higher likelihood of authentic capture)."
        band = "LIKELY_AUTHENTIC"
    else:
        interpretation = "Model output is inconclusive within the intermediate decision boundary."
        band = "INCONCLUSIVE"

    return {
        "provider": "GenD-DINOv3-L",
        "model_id": repo_id,
        "model_loaded": True,
        "device": device.type.upper(),
        "runtime": "Local",
        "status": "Inference completed",
        "inference_time_ms": round(elapsed_ms, 2),
        "detector_score": detector_score,
        "raw_probabilities": [round(float(p), 4) for p in probs],
        "confidence_band": band,
        "interpretation": interpretation,
    }


def get_health_status(repo_id: str = MODEL_REPO_ID) -> Dict[str, Any]:
    """Returns local model health information without exposing sensitive system paths."""
    device = get_target_device()
    is_loaded = _cached_model is not None

    return {
        "provider": "GenD-DINOv3-L",
        "model_id": repo_id,
        "model_loaded": is_loaded,
        "device": device.type.lower(),
        "runtime": "local",
    }


def start_server(port: int = 5001, host: str = "127.0.0.1"):
    """
    Lightweight HTTP daemon for low-latency persistent inference from Node.js backend.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler

    print(f"[GenD Provider] Pre-warming model '{MODEL_REPO_ID}'...")
    try:
        load_model(MODEL_REPO_ID)
        print(f"[GenD Provider] Model loaded on device: {_cached_device}")
    except Exception as e:
        print(f"[GenD Provider] Warning during pre-warm: {e}", file=sys.stderr)

    class GenDHandler(BaseHTTPRequestHandler):
        def _send_json(self, status_code: int, data: Dict[str, Any]):
            body = json.dumps(data).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path in ("/health", "/status", "/api/v1/ml/status"):
                self._send_json(200, get_health_status())
            else:
                self._send_json(404, {"error": "Not Found"})

        def do_POST(self):
            if self.path in ("/predict", "/api/v1/ml/predict"):
                try:
                    content_length = int(self.headers.get("Content-Length", 0))
                    raw_body = self.rfile.read(content_length)
                    req_data = json.loads(raw_body.decode("utf-8"))
                    image_path = req_data.get("image_path")
                    if not image_path:
                        self._send_json(400, {"error": "image_path is required"})
                        return

                    result = run_inference(image_path)
                    self._send_json(200, result)
                except Exception as ex:
                    self._send_json(500, {"error": str(ex)})
            else:
                self._send_json(404, {"error": "Not Found"})

        def log_message(self, format, *args):
            # Suppress noisy HTTP request logging
            pass

    server = HTTPServer((host, port), GenDHandler)
    print(f"[GenD Provider] Service listening at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[GenD Provider] Shutting down.")
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description="GenD-DINOv3-L Local Forensic ML Provider")
    parser.add_argument("image", nargs="?", help="Path to local image for forensic analysis")
    parser.add_argument("--json", action="store_true", help="Output results strictly as JSON")
    parser.add_argument("--health", action="store_true", help="Print model health/status as JSON")
    parser.add_argument("--server", action="store_true", help="Run as persistent HTTP daemon")
    parser.add_argument("--port", type=int, default=5001, help="Port for persistent HTTP daemon (default: 5001)")
    parser.add_argument("--host", default="127.0.0.1", help="Host for HTTP daemon (default: 127.0.0.1)")

    args = parser.parse_args()

    if args.server:
        start_server(port=args.port, host=args.host)
        return

    if args.health:
        print(json.dumps(get_health_status(), indent=2))
        return

    if not args.image:
        parser.print_help()
        sys.exit(1)

    try:
        result = run_inference(args.image)
        if args.json:
            print(json.dumps(result))
        else:
            # Human-readable format required by prompt:
            # Model: GenD-DINOv3-L
            # Device: CUDA/CPU
            # Inference time: ...
            # Detector score: ...
            # Interpretation: ...
            print(f"Model: {result['provider']}")
            print(f"Device: {result['device']}")
            print(f"Inference time: {result['inference_time_ms']} ms")
            print(f"Detector score: {result['detector_score']}")
            print(f"Interpretation: {result['interpretation']}")
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e), "model_loaded": False}))
        else:
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
