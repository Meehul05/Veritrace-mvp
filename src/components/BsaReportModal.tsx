import React, { useState } from 'react';
import { X, FileText, Download, CheckCircle2, ShieldCheck, Copy, Check, Scale, PenTool } from 'lucide-react';
import { ForensicReport, Evidence, Investigation } from '../types';

interface BsaReportModalProps {
  evidence: Evidence;
  investigation?: Investigation;
  onClose: () => void;
}

export const BsaReportModal: React.FC<BsaReportModalProps> = ({ evidence, investigation, onClose }) => {
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [examinerName, setExaminerName] = useState(investigation?.investigating_officer || 'Inspector V. Sharma');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/reports/bsa-section-63', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidence.id,
          investigation_id: investigation?.id || 'inv_default_001',
          examiner_name: examinerName,
          actor: examinerName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Report generation failed');
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Section 63 report package.');
    } finally {
      setLoading(false);
    }
  };

  const certifyReport = async () => {
    if (!report) return;
    setCertifying(true);
    try {
      const res = await fetch(`/api/v1/reports/${report.id}/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examiner_name: examinerName,
        }),
      });

      if (!res.ok) {
        throw new Error('Certification failed');
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Certification error');
    } finally {
      setCertifying(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Section 63 BSA Forensic Report Package (M15)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Bharatiya Sakshya Adhiniyam 2023 Statutory Admissibility Certificate
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
              {error}
            </div>
          )}

          {!report ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="font-semibold text-slate-800">
                  Target Evidence for Certificate Generation:
                </p>
                <div className="space-y-1.5 text-slate-600 font-mono text-[11px]">
                  <p>Filename: {evidence.original_filename}</p>
                  <p>SHA-256: {evidence.sha256}</p>
                  <p>Size: {evidence.size_bytes} bytes | Storage Ref: {evidence.storage_ref}</p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Certifying Forensic Examiner Name:
                </label>
                <input
                  type="text"
                  value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-sky-400" />
                )}
                <span>{loading ? 'Compiling Evidentiary PDF Package...' : 'Generate Section 63 BSA PDF Package'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Generated Report Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        BSA_Section63_Report_{report.id}.pdf
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Generated {new Date(report.generated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                      report.certification_status === 'CERTIFIED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {report.certification_status}
                  </span>
                </div>

                {/* PDF Cryptographic Hash */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Tamper-Evident PDF SHA-256 Hash
                  </span>
                  <div className="flex items-center justify-between mt-1 bg-white p-2 rounded border border-slate-200">
                    <span className="font-mono text-[11px] text-slate-800 truncate mr-2">
                      {report.report_hash}
                    </span>
                    <button
                      onClick={() => copyHash(report.report_hash)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Download Button */}
                <div className="pt-2 flex items-center justify-end">
                  <a
                    href={`/api/v1/reports/${report.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signed PDF Document</span>
                  </a>
                </div>
              </div>

              {/* Legal Affirmation & Human Certification Box */}
              {report.certification_status !== 'CERTIFIED' ? (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-start space-x-2.5 text-amber-950">
                    <PenTool className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Human Certification Affirmation Required:</span>
                      <p className="mt-0.5 text-amber-900 leading-relaxed">
                        Under Bharatiya Sakshya Adhiniyam 2023, automated tools cannot certify evidence autonomously. As the designated forensic examiner, you must affirm that the digital source was maintained without bit alteration.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={certifyReport}
                    disabled={certifying}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {certifying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Sign &amp; Certify Evidentiary Report (Examiner Affirmation)</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-950">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Affirmed &amp; Certified under Section 63 BSA</p>
                    <p className="text-[11px] text-emerald-800">
                      Certified by {report.examiner_name} on {new Date(report.certification_date || '').toLocaleString()}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
