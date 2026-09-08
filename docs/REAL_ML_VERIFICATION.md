# Real ML Verification & Proof Document

## 1. Model Identity & Checkpoint
- **Model:** GenD Generalized Deepfake Detection
- **Backbone:** OpenAI CLIP ViT-L/14 foundational vision transformer (ungated) & DINOv3 ViT-L/16 architecture
- **Hugging Face Model Card:** `yermandy/GenD_CLIP_L_14` (checkpoint SHA: `d866a1...`) and `yermandy/GenD_DINOv3_L`
- **Weights File:** `model.safetensors`
- **License:** MIT

## 2. Preprocessing & Input Pipeline
- **Input:** Standard raw RGB image file (JPEG/PNG/WEBP) or video frames extracted via OpenCV
- **Pipeline:**
  1. PIL RGB decode
  2. Aspect-preserving bicubic resize with center crop to (224, 224)
  3. Tensor conversion to `float32` in `[0.0, 1.0]`
  4. Channel-wise standard normalization (Mean: `[0.48145466, 0.4578275, 0.40821073]`, Std: `[0.26862954, 0.26130258, 0.27577711]`)
  5. Add batch dimension: shape `(1, 3, 224, 224)`

## 3. Inference Pathway & Semantics
- Model forward pass computes:
  $$x = \text{Encoder}(I) \in \mathbb{R}^{768}$$
  $$x_{\text{norm}} = \frac{x}{\|x\|_2}$$
  $$z = W \cdot x_{\text{norm}} + b \in \mathbb{R}^2$$
  $$\text{probs} = \text{Softmax}(z)$$
- Logits: `[logit_real, logit_fake]`
- Probability of Manipulation: `probs[1]`

## 4. Verification Script
The verification script can be executed via:
```bash
python3 scripts/verify_model.py
```
This tests checkpoint loading, execution on CPU, and prints raw output logits, softmax probabilities, and measured inference latency in milliseconds.
