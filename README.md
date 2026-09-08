# VeriTrace — Digital Forensic & Deepfake Authentication Pipeline

[![Court Admissibility](https://img.shields.io/badge/Legal%20Standard-Section%2063%20BSA%202023-blue.svg)](#legal-compliance--evidentiary-standards)
[![Architecture](https://img.shields.io/badge/Architecture-Full--Stack%20Express%20%2B%20React%20%2B%20Vite-emerald.svg)](#architecture--modules)
[![OSINT Policy](https://img.shields.io/badge/OSINT-Strict%20Open%20Sources%20Only-amber.svg)](#open-source-intelligence-osint-web-tracking)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Forensics-slate.svg)](#)

**VeriTrace** is an evidence-grade digital forensic analysis and deepfake authentication system. Built to satisfy the stringent requirements of **Section 63 of the Bharatiya Sakshya Adhiniyam (BSA) 2023** (formerly Section 65B of the Indian Evidence Act), VeriTrace bridges the gap between machine learning inference and court-admissible forensic documentation.

The system combines multimodal neural artifact detection, physical sensor noise analysis, Error Level Analysis (ELA), C2PA content credential parsing, cryptographic provenance graphs (DAG), and privacy-compliant Open-Source Intelligence (OSINT) web tracking into a single, unified examination dashboard.

---

## Key Capabilities

1. **Multimodal Generative Artifact Inspection**
   - Combines Google Gemini Multimodal Vision with Laplacian edge variance and spatial frequency residual analysis.
   - Detects artifacts from generative diffusion architectures (**Midjourney, Stable Diffusion, Flux, DALL-E, StyleGAN**) and facial swaps versus physical camera sensor noise (Bayer filter patterns, natural optical depth-of-field).
2. **Error Level Analysis (ELA) & Localized Heatmaps**
   - Measures compression discrepancy matrices at 90% JPEG quantization to expose selective localized pixel modifications.
3. **Hardware & Cryptographic Integrity**
   - Immutable **SHA-256** asset fingerprinting upon ingestion.
   - Deep EXIF/TIFF metadata extraction (camera model, lens, exposure, GPS coordinates).
   - **C2PA Content Credentials** validation (detects digital watermarks, provenance manifests, and signing authority).
4. **Perceptual Hashing (pHash)**
   - Computes 64-bit DCT-based perceptual hashes to detect identical or near-duplicate assets within the evidentiary database using Hamming distance metrics.
5. **Open-Source Intelligence (OSINT) Web Tracking**
   - Searches open public internet repositories (Wikipedia, Wikimedia Commons, academic datasets such as USC-SIPI, GitHub, open news archives) to discover where an image has appeared.
   - **Strict Privacy Barrier**: Social media handles, private personal accounts, and closed messaging platforms (Instagram, Facebook, WhatsApp, Telegram, TikTok) are strictly excluded from queries.
   - Pinpoints the **earliest documented open-web baseline** and diffusion history.
6. **Provenance Directed Acyclic Graph (DAG)**
   - Interactive visual graph displaying cryptographic nodes, metadata, C2PA manifests, neural frames, and verified open-web occurrences.
7. **Court-Admissible Section 63 BSA Certification**
   - Automatically generates cryptographically hashed, court-ready PDF certificates with append-only audit trails, findings narratives, and human examiner signature affirmation.

---

## Architecture & Modules

```
                        ┌───────────────────────────────┐
                        │   Digital Evidence Ingestion  │
                        │    (JPEG, PNG, WebP, TIFF)    │
                        └──────────────┬────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     ┌──────────────────────┐                     ┌──────────────────────┐
     │  Cryptographic Layer │                     │  Metadata Extraction │
     │  • SHA-256 Identity  │                     │  • EXIF / Camera     │
     │  • Immutable Storage │                     │  • GPS Geo-location  │
     │  • Append-Only Audit │                     │  • C2PA Manifests    │
     └──────────┬───────────┘                     └──────────┬───────────┘
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ Neural Artifacts │          │   Spatial & ELA  │          │   OSINT Engine   │
│ • Gemini Vision  │          │ • Error Level    │          │ • Wikipedia API  │
│ • Diffusion Check│          │   Analysis (ELA) │          │ • Wikimedia API  │
│ • Deepfake Attrib│          │ • Heatmap Gen    │          │ • Open Repos     │
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
            ┌──────────────────────┐      ┌──────────────────────┐
            │   Provenance Graph   │      │ Section 63 BSA Report│
            │   Interactive DAG    │      │ Signed PDF Evidence  │
            └──────────────────────┘      └──────────────────────┘
```

| Module | Identifier | Description |
| :--- | :--- | :--- |
| **M1** | Evidence Ingestion | Sanitized storage, MIME-type enforcement, SHA-256 identity calculation. |
| **M2** | Metadata & EXIF | Hardware sensor tags, lens model, GPS latitude/longitude, timestamp tags. |
| **M3** | C2PA Content Credentials | Extraction of Coalition for Content Provenance and Authenticity manifests. |
| **M4** | Perceptual Hash (pHash) | 64-bit DCT perceptual hash generation and Hamming distance matching. |
| **M5** | Frame Extraction | High-fidelity frame-by-frame and keyframe sampling for digital assets. |
| **M6** | Neural Artifact Inspection | Multimodal Gemini Vision + spatial edge variance for synthetic probability. |
| **M7** | Error Level Analysis | Dual-compression ELA artifact rendering and localized heatmaps. |
| **M8** | Decision Calibration | Adjustable classification threshold (0.20–0.80) and engine switching. |
| **M9** | OSINT Reverse Search | Open-source web tracking restricted to public encyclopedias & datasets. |
| **M10** | Earliest Baseline | Temporal origin resolution, original source name, and diffusion context. |
| **M11** | Provenance DAG | Interactive lineage graph tracking cryptographic, temporal, and web nodes. |
| **M12** | Audit Ledger | Tamper-evident append-only log of every system operation and user action. |
| **M13** | Examiner Affirmation | Legal affirmation workflow under penalty of perjury. |
| **M14** | Findings Narrative | Multi-section analytical report drafted in formal forensic terminology. |
| **M15** | Section 63 BSA Report | PDF export adhering to Section 63 BSA 2023 with cryptographic hashes. |

---

## Requirements

### System & Runtime Requirements
- **Node.js**: `v18.0.0` or higher (Recommended: `Node.js v20 LTS` or `v22 LTS`).
- **Operating System**: Linux, macOS, or Windows (WSL recommended for Windows).
- **Package Manager**: `npm` (v9+) or `bun` / `pnpm` / `yarn`.
- **Memory**: Minimum 2 GB RAM (4 GB recommended for concurrent image processing).
- **Storage**: ~500 MB for application dependencies and temporary forensic buffers.

### External Services & APIs
- **Google Gemini API Key** (`GEMINI_API_KEY`):
  - Used for multimodal neural artifact evaluation and open-source subject entity identification.
  - Can be obtained from [Google AI Studio](https://aistudio.google.com/).

---

## Dependencies

### Core Backend Dependencies
- **`express`** (`^4.21.2`): High-performance HTTP server handling REST endpoints and static file serving.
- **`@google/genai`** (`^2.4.0`): Official Google GenAI SDK for Gemini Multimodal Vision analysis.
- **`sharp`** (`^0.35.4`): High-speed C-based image processing for resizing, ELA difference matrices, and Laplacian convolutions.
- **`exifr`** (`^7.1.3`): Comprehensive EXIF, TIFF, XMP, and IPTC metadata parser.
- **`pdfkit`** (`^0.20.2`): Vector graphics and typography engine for Section 63 BSA certificate PDF generation.
- **`multer`** (`^2.3.0`): Multipart/form-data handler for streaming digital evidence uploads.
- **`esbuild`** (`^0.25.0`): Ultra-fast TypeScript bundler compiling the backend to `dist/server.cjs`.

### Core Frontend Dependencies
- **`react`** & **`react-dom`** (`^19.0.1`): Declarative UI library for reactive forensic panels.
- **`vite`** (`^6.2.3`): Frontend development tooling and production bundling.
- **`tailwindcss`** (`^4.1.14`) & **`@tailwindcss/vite`**: Utility-first CSS styling.
- **`lucide-react`** (`^0.546.0`): Accessible vector iconography for forensic indicators.
- **`motion`** (`^12.23.24`): Layout transitions and responsive interaction animations.

---

## Installation & Setup

### 1. Clone or Extract the Project
```bash
git clone <repository-url> veritrace
cd veritrace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` and supply your Gemini API key:
```env
# Required for Gemini Multimodal Vision and OSINT subject recognition
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Application URL (optional, defaults to http://localhost:3000)
APP_URL="http://localhost:3000"

# Server Port (optional, defaults to 3000)
PORT=3000
```

---

## How to Run

### Development Mode
Starts the full-stack application with hot reloading for the frontend and instant TypeScript execution for the server:
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

### Production Build & Execution
To compile the client into optimized static assets and bundle the server into an isolated CommonJS package:

1. **Build**:
   ```bash
   NODE_ENV=production npm run build
   ```
   *This generates `dist/index.html`, optimized assets in `dist/assets/`, and the bundled backend in `dist/server.cjs`.*

2. **Start**:
   ```bash
   NODE_ENV=production npm start
   ```
   *Launches the production server at `http://localhost:3000`.*

### Code Quality & Linting
Run TypeScript type-checking across all client and server files:
```bash
npm run lint
```

---

## Step-by-Step User Guide

### 1. Ingest Evidence
- Drag and drop or upload an image (`.jpg`, `.png`, `.webp`, `.tiff`).
- The system automatically calculates its cryptographic **SHA-256 identity hash**, records the file size, assigns an internal Evidence ID, and stores the unaltered binary into immutable storage.

### 2. Inspect Hardware & C2PA Metadata
- Review the **Metadata Panel** to examine camera make, lens specifications, exposure settings, and GPS coordinates.
- Check the **C2PA Credentials Badge** to verify if authentic cryptographic signing manifests are present.

### 3. Analyze Neural Generative Artifacts & ELA
- View the **Neural Generative Artifact Score** (0.0% to 100.0% synthetic probability).
- Review the **Model Source Attribution breakdown** (Stable Diffusion, Midjourney, DALL-E, or physical sensor).
- Toggle the **ELA Heatmap View** to inspect localized compression variances and high-frequency edge inconsistencies.
- Adjust the **Decision Threshold Slider** (0.20–0.80) or switch between inference engines (*Ensemble, Gemini Vision, Swin-B Spatial, Source ViT*).

### 4. Perform Open-Source (OSINT) Web Tracking
- Navigate to the **Open-Source Web Provenance & Reverse Image Tracker**.
- Optionally enter a keyword or domain filter (e.g., `Lena Soderberg`, `Stanford Alpaca`, `dataset`).
- Click **"Track Across Open Web"**:
  - The system queries open sources (Wikipedia, Wikimedia Commons, open repositories) and correlates visual findings.
  - Review the **Earliest Known Open-Web Baseline** card to view the first recorded publication date, source platform, and historical context.
  - Filter open-source matches using category chips (*All Sources, Academic / Research, Encyclopedias, Code & Data Repos, News Archives*).

### 5. Inspect the Provenance Graph (DAG)
- Switch to the **Provenance Graph View** to visualize the cryptographic lineage connecting the original file, its SHA-256 hash, metadata, neural analysis frames, and earliest open-source appearance.

### 6. Certify and Export Section 63 BSA Report
- Enter the **Examiner Name** and review the automated 6-section findings narrative.
- Click **"Affirm & Certify Evidence"** to sign the record under penalty of perjury.
- Click **"Download Section 63 BSA Certificate (PDF)"** to obtain an official legal report suitable for court submission.

---

## API Reference

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check and module operational status. |
| `GET` | `/api/v1/evidence` | List all ingested evidence records with status summaries. |
| `GET` | `/api/v1/evidence/:id` | Retrieve comprehensive forensic details for a specific evidence record. |
| `POST`| `/api/v1/evidence/upload` | Ingest new digital evidence (`multipart/form-data`). |
| `POST`| `/api/v1/evidence/:id/reanalyze` | Re-run ML inference with custom engine or threshold parameters. |
| `POST`| `/api/v1/reverse-search` | Trigger open-source OSINT image tracking and origin resolution. |
| `GET` | `/api/v1/provenance/:id` | Retrieve the nodes and edges for the Provenance DAG. |
| `GET` | `/api/v1/audit/:id` | Fetch the append-only cryptographic audit ledger for an evidence record. |
| `POST`| `/api/v1/reports/bsa-section-63`| Generate a Section 63 BSA court certificate PDF. |
| `GET` | `/api/v1/reports/:id/download` | Download the generated PDF report. |
| `POST`| `/api/v1/reports/:id/certify` | Record human examiner certification and legal affirmation. |

---

## Legal Compliance & Evidentiary Standards

VeriTrace is designed specifically to comply with **Section 63 of Bharatiya Sakshya Adhiniyam (BSA) 2023**:

1. **Unbroken Chain of Custody (Subsection 63(2))**:
   - The SHA-256 digest is generated at ingestion before any file manipulation.
   - Every read, transformation, re-analysis, and export is recorded in an append-only audit ledger with actor attribution and timestamps.
2. **Technological Neutrality & Transparency**:
   - Machine learning inference is presented as technical evidentiary support rather than an unquestioned black-box conclusion.
   - Comprehensive error metrics, model versions, and quality degradation flags (`LOW_RESOLUTION`, `HIGH_DEGRADATION`) are explicitly stated.
3. **Mandatory Human Examiner Affirmation (Subsection 63(4))**:
   - Automated indicators remain preliminary until verified and certified by a human examiner affirming the authenticity of the process.

---

## Privacy & Ethical OSINT Guarantee

VeriTrace enforces strict technological boundaries on its OSINT tracker:
- **No Private Handles**: The system strictly ignores, blocks, and refuses to scrape private social media profiles, direct messages, or closed networks (including Instagram, Facebook, WhatsApp, Telegram, TikTok, and Snapchat).
- **Public Domain Only**: External correlation queries are restricted exclusively to publicly documented encyclopedias, open academic datasets, verified public code repositories, and archived news records.
- **Investigator Confidentiality Safeguard**: External network calls are never executed automatically; they require explicit initiation by the forensic examiner to prevent unauthorized data egress.
