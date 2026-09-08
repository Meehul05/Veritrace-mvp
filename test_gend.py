#!/usr/bin/env python3
"""
Simple CLI test command for VeriTrace GenD-DINOv3-L Local Forensic Model.

Usage:
    python test_gend.py <path-to-image>
"""

import sys
import os

# Add src/server/python to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "server", "python"))

from gend_provider import run_inference

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_gend.py <path-to-image>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.isfile(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    try:
        res = run_inference(image_path)
        print(f"Model: {res['provider']}")
        print(f"Device: {res['device']}")
        print(f"Inference time: {res['inference_time_ms']} ms")
        print(f"Detector score: {res['detector_score']}")
        print(f"Interpretation: {res['interpretation']}")
    except Exception as e:
        print(f"Error executing GenD inference: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
