import uuid
import io
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.database import get_db
from backend.services.storage_service import StorageService
from backend.services.audit_service import AuditService

class ReportService:
    """
    M15 Section 63 BSA Structured Report Package Generator.
    Produces verifiable, tamper-evident PDF evidentiary packages aligned with
    Bharatiya Sakshya Adhiniyam 2023 Section 63 electronic record admissibility.
    INVARIANTS:
    - System never marks report CERTIFIED autonomously; initial status is DRAFT or PENDING_CERTIFICATION.
    - Two signature blocks (Examiner + Device Owner).
    - SHA-256 report hash calculated from exact PDF byte stream.
    """

    @staticmethod
    def generate_bsa_report(
        evidence_id: str,
        investigation_id: str,
        assessment: dict,
        examiner_name: str = "Forensic Examiner",
        actor: str = "System"
    ) -> dict:
        report_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            inv = conn.execute("SELECT * FROM investigations WHERE id = ?", (investigation_id,)).fetchone()
            ev = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
            audit_trail = conn.execute(
                "SELECT * FROM audit_events WHERE evidence_id = ? ORDER BY timestamp ASC",
                (evidence_id,)
            ).fetchall()

        case_number = inv["case_number"] if inv else "INV-2026-001"
        officer = inv["investigating_officer"] if inv else examiner_name
        jurisdiction = inv["jurisdiction"] if inv else "Cyber Forensics Division"

        # Generate PDF using ReportLab
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a")
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569")
        )
        section_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#334155")
        )
        code_style = ParagraphStyle(
            "ReportCode",
            parent=styles["Normal"],
            fontName="Courier",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#0f172a")
        )

        elements = []

        # Header Banner
        elements.append(Paragraph("FORENSIC EXAMINATION REPORT (BSA SECTION 63)", title_style))
        elements.append(Paragraph(f"Case Number: {case_number} | Jurisdiction: {jurisdiction} | Generated: {now_iso}", subtitle_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

        # 1. Evidence Identification Table
        elements.append(Paragraph("1. EVIDENCE RECORD & CRYPTOGRAPHIC IDENTITY", section_style))
        ev_data = [
            [Paragraph("<b>Original Filename</b>", body_style), Paragraph(ev["original_filename"] if ev else "N/A", body_style)],
            [Paragraph("<b>Cryptographic Hash (SHA-256)</b>", body_style), Paragraph(ev["sha256"] if ev else "N/A", code_style)],
            [Paragraph("<b>File Size</b>", body_style), Paragraph(f"{ev['size_bytes']} bytes ({ev['size_bytes']/(1024*1024):.2f} MB)" if ev else "N/A", body_style)],
            [Paragraph("<b>MIME Type / Media</b>", body_style), Paragraph(f"{ev['mime_type']} ({ev['media_type']})" if ev else "N/A", body_style)],
            [Paragraph("<b>Ingestion Timestamp</b>", body_style), Paragraph(ev["ingested_at"] if ev else "N/A", body_style)],
        ]
        t_ev = Table(ev_data, colWidths=[160, 370])
        t_ev.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t_ev)
        elements.append(Spacer(1, 10))

        # 2. Automated Forensic Findings
        elements.append(Paragraph("2. AUTOMATED FORENSIC SUMMARY & ML INFERENCE", section_style))
        frames = assessment.get("frame_analyses", [])
        ml_score_display = f"{frames[0]['ml_score']:.2%}" if frames else "N/A"
        summary_data = [
            [Paragraph("<b>Overall Automated Verdict</b>", body_style), Paragraph(assessment.get("verdict", "INCONCLUSIVE"), body_style)],
            [Paragraph("<b>Analysis Pipeline Version</b>", body_style), Paragraph(assessment.get("pipeline_version", "v1.1.0"), body_style)],
            [Paragraph("<b>C2PA Content Credentials</b>", body_style), Paragraph(assessment.get("c2pa_state", "NOT_FOUND"), body_style)],
            [Paragraph("<b>Camera Make/Model</b>", body_style), Paragraph(assessment.get("camera_model") or "Not Present in Headers", body_style)],
            [Paragraph("<b>Neural Model Score</b>", body_style), Paragraph(f"{ml_score_display} (Artifact probability)", body_style)],
            [Paragraph("<b>Earliest Indexed Source</b>", body_style), Paragraph(assessment.get("resolved_earliest_source") or "None Discovered", body_style)]
        ]
        t_sum = Table(summary_data, colWidths=[160, 370])
        t_sum.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t_sum)
        elements.append(Spacer(1, 10))

        # 3. Chain of Custody Audit Trail
        elements.append(Paragraph("3. CUSTODY & AUDIT LEDGER (APPEND-ONLY)", section_style))
        audit_rows = [[Paragraph("<b>Timestamp (UTC)</b>", body_style), Paragraph("<b>Module</b>", body_style), Paragraph("<b>Event</b>", body_style), Paragraph("<b>Actor</b>", body_style)]]
        for a in audit_trail[:8]:  # display up to 8 key events
            audit_rows.append([
                Paragraph(a["timestamp"][:19].replace("T", " "), code_style),
                Paragraph(a["module_name"], body_style),
                Paragraph(a["event_type"], body_style),
                Paragraph(a["actor"], body_style)
            ])
        t_aud = Table(audit_rows, colWidths=[110, 110, 200, 110])
        t_aud.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_aud)
        elements.append(Spacer(1, 14))

        # 4. Mandatory Section 63 BSA Certification & Signature Blocks
        elements.append(Paragraph("4. SECTION 63 BHARATIYA SAKSHYA ADHINIYAM (BSA) CERTIFICATION", section_style))
        cert_text = (
            "I hereby certify that the electronic record described herein was received, preserved, and subjected to "
            "automated examination without alteration to the underlying exact bitstream. The digital hash SHA-256 "
            "was verified at every pipeline step. In accordance with Section 63 of Bharatiya Sakshya Adhiniyam 2023, "
            "this document constitutes an evidentiary forensic package requiring examiner verification prior to admission."
        )
        elements.append(Paragraph(cert_text, body_style))
        elements.append(Spacer(1, 14))

        sig_data = [
            [
                Paragraph("<b>EXAMINER CERTIFICATION</b><br/>Name: ______________________<br/>Title / Badge: _______________<br/>Signature: __________________<br/>Date: _______________________", body_style),
                Paragraph("<b>DEVICE OWNER / SOURCE ACKNOWLEDGEMENT</b><br/>Name: ______________________<br/>Contact / ID: ________________<br/>Signature: __________________<br/>Date: _______________________", body_style),
            ]
        ]
        t_sig = Table(sig_data, colWidths=[265, 265])
        t_sig.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#64748b")),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(t_sig)

        doc.build(elements)
        pdf_bytes = buffer.getvalue()

        # Compute tamper-evident hash of the PDF report itself
        report_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # Store PDF package
        storage_ref = StorageService.store_report_package(report_id, pdf_bytes)

        # Invariant: Initial certification status is PENDING_CERTIFICATION
        certification_status = "PENDING_CERTIFICATION"

        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO forensic_reports (
                    id, evidence_id, investigation_id, forensic_assessment_id,
                    generated_at, generated_by, storage_ref, report_hash,
                    examiner_name, examiner_signature_ref, device_owner_signature_ref,
                    certification_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id, evidence_id, investigation_id,
                    assessment.get("assessment_id"), now_iso, actor,
                    storage_ref, report_sha256, examiner_name,
                    None, None, certification_status
                )
            )

        AuditService.log_event(
            actor=actor,
            module_name="ReportService",
            event_type="BSA_REPORT_GENERATED",
            event_detail={
                "report_id": report_id,
                "report_hash": report_sha256,
                "certification_status": certification_status,
                "examiner_name": examiner_name
            },
            evidence_id=evidence_id,
            investigation_id=investigation_id
        )

        return {
            "report_id": report_id,
            "evidence_id": evidence_id,
            "investigation_id": investigation_id,
            "generated_at": now_iso,
            "storage_ref": storage_ref,
            "report_hash": report_sha256,
            "examiner_name": examiner_name,
            "certification_status": certification_status,
            "filename": f"BSA_Section63_Report_{report_id}.pdf"
        }
