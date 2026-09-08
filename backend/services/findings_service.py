class FindingsService:
    """
    M13 Findings Narrative Service.
    Translates ForensicAssessment JSON into structured, human-readable forensic narrative.
    Strictly follows evidentiary neutrality guidelines:
    - Never uses absolute certainty words ("proven fake", "100% genuine").
    - Notes missing/incomplete data explicitly.
    - Emphasizes that absence of C2PA is neutral.
    """

    @staticmethod
    def generate_narrative(assessment: dict) -> dict:
        ev = assessment.get("evidence_metadata", {})
        filename = ev.get("filename", "Unknown file")
        sha256 = ev.get("sha256", "Unknown")
        verdict = assessment.get("verdict", "INCONCLUSIVE")
        overall_status = assessment.get("overall_status", "PARTIAL")
        c2pa_state = assessment.get("c2pa_state", "NOT_FOUND")
        camera_model = assessment.get("camera_model")
        frames = assessment.get("frame_analyses", [])
        searches_count = assessment.get("search_results_count", 0)
        earliest_source = assessment.get("resolved_earliest_source")

        sections = []

        # 1. Executive Summary
        summary = (
            f"Forensic analysis of evidence file '{filename}' (SHA-256: {sha256[:16]}...) "
            f"completed under pipeline {assessment.get('pipeline_version')}. "
            f"Overall analysis status: {overall_status}. "
            f"Preliminary automated indicator: {verdict}."
        )
        sections.append({"title": "1. Executive Summary", "content": summary})

        # 2. Cryptographic and Provenance Verification
        c2pa_desc = {
            "VALID": f"Cryptographic Content Credentials (C2PA) verified successfully. Issuer: {assessment.get('c2pa_issuer', 'Unknown')}.",
            "INVALID": "A cryptographic C2PA manifest was detected, but signature validation failed or integrity checks failed.",
            "NOT_FOUND": "No cryptographic C2PA Content Credentials manifest was identified. NOTE: Absence of C2PA manifest is a neutral finding and does not indicate manipulation (many consumer recording tools and social platforms do not embed C2PA).",
            "MODULE_UNAVAILABLE": "C2PA validation module was unavailable or unconfigured in the analysis environment."
        }.get(c2pa_state, f"C2PA State: {c2pa_state}")
        sections.append({"title": "2. Cryptographic Integrity & Content Credentials", "content": c2pa_desc})

        # 3. Technical Metadata Findings
        if camera_model:
            meta_desc = f"EXIF metadata indicates recording device: '{camera_model}'. GPS metadata present: {assessment.get('gps_present')}."
        else:
            meta_desc = "Standard camera make/model EXIF tags are absent from the file headers. This frequently occurs when media is transcoded or distributed via social messaging services."
        sections.append({"title": "3. Technical & EXIF Metadata", "content": meta_desc})

        # 4. Neural Forensic Inspection
        if frames:
            scores = [f["ml_score"] for f in frames]
            avg_score = sum(scores) / len(scores)
            ml_desc = (
                f"Evaluated {len(frames)} representative frame(s) using foundational deepfake detection model "
                f"('{frames[0].get('model_name', 'GenD')}'). Average synthetic artifact probability: {avg_score:.2%}. "
                f"Observed confidence band: {frames[0].get('confidence_band')}. "
                f"Quality flag: {frames[0].get('quality_flag', 'OK')}."
            )
        else:
            ml_desc = "No representative frames were evaluated by the neural forensic model."
        sections.append({"title": "4. Model Inference & Artifact Inspection", "content": ml_desc})

        # 5. External Index & Timeline Correlation
        if earliest_source:
            search_desc = f"Correlated with public web indexes. Earliest indexed occurrence detected at {earliest_source}."
        elif searches_count > 0:
            search_desc = f"Reverse search completed with {searches_count} public search occurrences found."
        else:
            search_desc = "No public search indexes were queried, or no external indexed matches were discovered."
        sections.append({"title": "5. Temporal & Index Correlation", "content": search_desc})

        # 6. Evidentiary Invariants & Scope Limitation
        disclaimer = (
            "DISCLAIMER & SECTION 63 BSA NOTICE: This report is an evidentiary analytical package generated "
            "to assist human forensic examiners and legal authorities. VeriTrace does not assert absolute certainty. "
            "Legal admissibility requires human examination, validation of custody, and physical certification."
        )
        sections.append({"title": "6. Legal & Evidentiary Scope Limitations", "content": disclaimer})

        return {
            "evidence_id": assessment.get("evidence_id"),
            "assessment_id": assessment.get("assessment_id"),
            "verdict": verdict,
            "overall_status": overall_status,
            "sections": sections
        }
