# VeriTrace System Limitations & Evidentiary Boundaries

## 1. Forensic & Legal Process Boundaries
1. **Probabilistic Forensic Indicator:** VeriTrace outputs automated forensic signals and analytical packages. It never asserts mathematical certainty (e.g., "100% fake" or "proven AI").
2. **Section 63 BSA Alignment:** Under Section 63 of the Bharatiya Sakshya Adhiniyam 2023, admissibility of electronic records requires human verification, official examiner testimony, and continuous custody documentation. The generated PDF report is an **evidentiary package for human certification**, not a self-admissible legal document. The system never marks a report `CERTIFIED` autonomously.
3. **Earliest Known Indexed Source:** VeriTrace resolves the earliest indexed public instance discovered through the evidence database and explicit reverse searches. It does not claim to identify the true offline human creator or physical camera owner.
4. **No Face Recognition:** VeriTrace performs structural and artifact forensic inspection; it does not perform biometric face identification or match individuals to identities.

## 2. Technical Limitations
1. **Adversarial Compression:** Severe social media compression (e.g., repeated WhatsApp/X transcode) can attenuate high-frequency generative artifacts. On severely degraded media, VeriTrace outputs `INCONCLUSIVE (HIGH DEGRADATION)` rather than a false authentic verdict.
2. **C2PA Manifest Stripping:** Social media platforms routinely strip metadata and C2PA Content Credentials. VeriTrace marks absent manifests as `No Cryptographic Provenance Found`; this is neutral and never treated as proof of manipulation.
3. **Explicit External Egress:** Evidence is never sent externally without an explicit investigator command (`/reverse-search`). Local similarity matches are performed via Hamming distance on perceptual hashes (pHash).
