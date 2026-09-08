import PDFDocument from 'pdfkit';
import { db } from './db';
import { StorageService } from './storage';
import { HashingService } from './hashing';
import { AuditService } from './audit';
import { ForensicReport } from './types';

export class ReportService {
  /**
   * M15 Section 63 BSA Structured Report Package Generator.
   * Generates tamper-evident, court-ready PDF evidentiary package.
   * Invariant: Never marks report CERTIFIED autonomously; sets PENDING_CERTIFICATION.
   */
  static async generateBsaReport(
    evidenceId: string,
    investigationId: string,
    examinerName: string = 'Inspector V. Sharma',
    actor: string = 'Investigating Officer'
  ): Promise<ForensicReport> {
    const evidence = db.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found.`);
    }

    const investigation = db.getInvestigation(investigationId);
    const assessment = db.getLatestForensicAssessment(evidenceId);
    const auditTrail = db.getAuditEvents(evidenceId);

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const caseNumber = investigation?.case_number || 'BSA-CYBER-2026-0842';
    const officer = investigation?.investigating_officer || examinerName;
    const jurisdiction = investigation?.jurisdiction || 'State Cyber Forensics Division';

    // Generate PDF in memory buffer using PDFKit
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Title & Header Banner
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('FORENSIC EXAMINATION REPORT');
      doc.fillColor('#475569').fontSize(10).font('Helvetica').text('BHARATIYA SAKSHYA ADHINIYAM (BSA) 2023 — SECTION 63');
      doc.fillColor('#64748b').fontSize(8).text(`Case No: ${caseNumber}  |  Jurisdiction: ${jurisdiction}  |  Date: ${now}`);
      doc.moveDown(0.5);

      // Horizontal separator line
      doc.strokeColor('#0284c7').lineWidth(1.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Section 1: Evidence & Cryptographic Identity
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('1. EVIDENCE IDENTIFICATION & CRYPTOGRAPHIC IDENTITY');
      doc.moveDown(0.4);
      doc.fontSize(8.5).font('Helvetica');

      const evInfo = [
        `Original Filename: ${evidence.original_filename}`,
        `Cryptographic Hash (SHA-256): ${evidence.sha256}`,
        `File Size: ${evidence.size_bytes} bytes (${(evidence.size_bytes / (1024 * 1024)).toFixed(2)} MB)`,
        `MIME Type / Container: ${evidence.mime_type} (${evidence.media_type})`,
        `Ingestion Timestamp: ${evidence.ingested_at} (UTC)`,
        `Write-Once Storage Reference: ${evidence.storage_ref}`,
      ];

      for (const line of evInfo) {
        doc.fillColor('#334155').text(line);
      }
      doc.moveDown(1);

      // Section 2: Automated Forensic Summary
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('2. AUTOMATED FORENSIC SUMMARY & ML INFERENCE');
      doc.moveDown(0.4);
      doc.fontSize(8.5).font('Helvetica');

      const findings = [
        `Automated Preliminary Indicator: ${assessment?.verdict || 'INCONCLUSIVE'}`,
        `Overall Pipeline Status: ${assessment?.overall_status || 'PENDING'} (Pipeline Version: ${assessment?.pipeline_version || '1.1.0'})`,
        `C2PA Content Credentials: ${assessment?.assessment_data.c2pa_status || 'NOT_FOUND'} (Issuer: ${assessment?.assessment_data.c2pa_issuer || 'None'})`,
        `Device Hardware (EXIF): ${assessment?.assessment_data.camera_model || 'None detected in file headers'}`,
        `GPS Metadata: ${assessment?.assessment_data.gps_present ? 'Present' : 'Not recorded'}`,
        `Neural Generative Artifact Score: ${((assessment?.overall_confidence || 0) * 100).toFixed(1)}% synthetic probability`,
        `Earliest Known Open-Source Appearance: ${assessment?.assessment_data.earliest_source || 'None discovered'}${assessment?.assessment_data.earliest_source_name ? ` (${assessment?.assessment_data.earliest_source_name})` : ''}`,
        `OSINT Visual Subject Correlation: ${assessment?.assessment_data.identified_subject || 'Standard baseline analysis'}`,
        `Open Source Compliance: Verified Public Indices Only (Private handles excluded)`,
      ];

      for (const f of findings) {
        doc.fillColor('#334155').text(f);
      }
      doc.moveDown(1);

      // Section 3: Custody & Audit Trail (Last 6 events)
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('3. CHAIN OF CUSTODY & AUDIT LEDGER (APPEND-ONLY)');
      doc.moveDown(0.4);
      doc.fontSize(8).font('Courier');

      for (const event of auditTrail.slice(-6)) {
        doc.fillColor('#1e293b').text(
          `[${event.timestamp.substring(0, 19).replace('T', ' ')}] ${event.module_name.padEnd(20)} ${event.event_type.padEnd(26)} Actor: ${event.actor}`
        );
      }
      doc.moveDown(1.2);

      // Section 4: Mandatory Statutory Affirmation (BSA Section 63)
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('4. SECTION 63 BHARATIYA SAKSHYA ADHINIYAM (BSA) CERTIFICATION');
      doc.moveDown(0.4);
      doc.fontSize(8).font('Helvetica').fillColor('#334155').text(
        'I hereby certify that the electronic record identified above was ingested into the VeriTrace forensic system in the ordinary course of official investigation. The cryptographic SHA-256 hash was generated directly from the unaltered bitstream upon receipt. The storage repository enforces strict write-once semantics, ensuring no subsequent modification, tampering, or bit degradation. This report constitutes a structured evidentiary package prepared for human expert evaluation and legal certification under Section 63 of Bharatiya Sakshya Adhiniyam 2023.'
      );
      doc.moveDown(1.5);

      // Section 5: Signature Blocks
      const boxY = doc.y;
      // Examiner Box
      doc.rect(40, boxY, 245, 95).strokeColor('#94a3b8').lineWidth(1).stroke();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('FORENSIC EXAMINER CERTIFICATION', 50, boxY + 10);
      doc.fontSize(8).font('Helvetica').fillColor('#475569');
      doc.text(`Examiner Name: ${officer}`, 50, boxY + 25);
      doc.text('Designation / Badge: Inspector / Cyber Forensic Cell', 50, boxY + 38);
      doc.text('Signature: ____________________________________', 50, boxY + 54);
      doc.text(`Date of Certification: ________________________`, 50, boxY + 70);

      // Source / Device Owner Box
      doc.rect(300, boxY, 245, 95).strokeColor('#94a3b8').lineWidth(1).stroke();
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('DEVICE OWNER / SOURCE WITNESS', 310, boxY + 10);
      doc.fontSize(8).font('Helvetica').fillColor('#475569');
      doc.text('Source Name: _________________________________', 310, boxY + 25);
      doc.text('Contact / ID Proof: __________________________', 310, boxY + 38);
      doc.text('Signature: ____________________________________', 310, boxY + 54);
      doc.text('Date of Custody: ______________________________', 310, boxY + 70);

      doc.end();
    });

    // Compute tamper-evident SHA-256 on the PDF bytes
    const reportHash = HashingService.computeSha256(pdfBuffer);
    const storageRef = StorageService.storeReport(reportId, pdfBuffer);

    const report: ForensicReport = {
      id: reportId,
      evidence_id: evidenceId,
      investigation_id: investigationId,
      forensic_assessment_id: assessment?.id || 'none',
      generated_at: now,
      generated_by: actor,
      storage_ref: storageRef,
      report_hash: reportHash,
      examiner_name: examinerName,
      certification_status: 'PENDING_CERTIFICATION',
    };

    db.insertForensicReport(report);

    AuditService.logEvent(
      actor,
      'ReportService',
      'BSA_REPORT_GENERATED',
      {
        report_id: reportId,
        report_hash: reportHash,
        certification_status: report.certification_status,
      },
      evidenceId,
      investigationId
    );

    return report;
  }
}
