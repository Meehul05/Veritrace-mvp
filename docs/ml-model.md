# ML Model Documentation: GenD (Deepfake Detection that Generalizes Across Benchmarks)

## Model Overview
- **Model Name:** GenD (Generalized Deepfake Detection)
- **Paper:** *Deepfake Detection that Generalizes Across Benchmarks* (WACV 2026, arXiv:2508.06248)
- **Author / Organization:** Andy Yermakov (`yermandy`)
- **Repository:** [https://github.com/yermandy/GenD](https://github.com/yermandy/GenD)
- **Hugging Face Hub:**
  - `yermandy/GenD_CLIP_L_14` (Public, un-gated, 428M parameters, ViT-L/14 backbone)
  - `yermandy/GenD_DINOv3_L` (303.1M parameters, ViT-L/16 backbone)
- **License:** MIT License

## Architecture & Principles
The GenD approach focuses on parameter-efficient adaptation of foundational vision encoders:
1. **Backbone:** Frozen foundational Vision Transformer encoder (CLIP-ViT-L/14 or DINOv3-ViT-L/16).
2. **Classifier Head:** Normalized Linear Probe (`LinearNorm`). Features extracted from the backbone are $L_2$-normalized onto a hyperspherical manifold ($x_{norm} = \frac{x}{\|x\|_2}$) before linear classification into 2 classes:
   - Index 0: `Real / Authentic`
   - Index 1: `Manipulated / Deepfake / AI-generated`
3. **Loss & Training Strategy:** Metric learning with hyperspherical feature constraints trained on paired real-fake sequences to prevent shortcut learning.

## Input Specifications & Preprocessing
- **Input Tensor Dimensions:** `(B, 3, 224, 224)`
- **Color Space:** RGB
- **Normalization:** Standard ImageNet normalization:
  - Mean: `[0.485, 0.456, 0.406]` (or CLIP vision mean `[0.48145466, 0.4578275, 0.40821073]`)
  - Standard Deviation: `[0.229, 0.224, 0.225]` (or CLIP vision std `[0.26862954, 0.26130258, 0.27577711]`)
- **Interpolation:** Bicubic interpolation with aspect ratio preservation and center cropping to 224×224.

## Output Semantics
- **Raw Output:** 2-dimensional logits tensor `[logit_real, logit_fake]`
- **Probability:** Computed via Softmax:
  $$P(\text{manipulated}) = \frac{e^{\text{logit}_{\text{fake}}}}{e^{\text{logit}_{\text{real}}} + e^{\text{logit}_{\text{fake}}}}$$
- **Confidence Banding & Verdict:**
  - $P(\text{manipulated}) \ge 0.80$: **`LIKELY_MANIPULATED`** (High model confidence of synthetic/altered artifacts)
  - $0.30 \le P(\text{manipulated}) < 0.80$: **`INCONCLUSIVE`** (Ambiguous boundary region, adversarial compression, or subtle editing)
  - $P(\text{manipulated}) < 0.30$: **`LIKELY_AUTHENTIC`** (Low model response for synthetic artifacts)
- **Degradation / Quality Override:** If resolution < 160×160, blur metric (Laplacian variance) < 30.0, or image is truncated, status is flagged with `HIGH_DEGRADATION` and capped to `INCONCLUSIVE`.

## Hardware & Execution Profiling
- **Device:** CPU (`torch.device('cpu')`) with AVX-512 acceleration on AMD x86_64
- **Precision:** FP32 (float32)
- **Inference Latency:** ~1.2 to 2.5 seconds per frame
- **VRAM / RAM:** ~1.5 GB memory footprint
