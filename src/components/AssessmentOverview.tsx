import React from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, FileText, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { ForensicAssessment, Evidence } from '../types';

interface AssessmentOverviewProps {
  evidence: Evidence;
  assessment?: ForensicAssessment;
  narrative?: {
    title: string;
    verdict: string;
    sections: Array<{ heading: string; body: string }>;
  };
  onGenerateReport: () => void;
}

export const AssessmentOverview: React.FC<AssessmentOverviewProps> = ({
  evidence,
  assessment,
  narrative,
  onGenerateReport,
}) => {
  if (!assessment) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Analysis pipeline in progress...</p>
      </div>
    );
  }

  const verdict = assessment.verdict;
  const isManipulated = verdict.includes('MANIPULATED');
  const isAuthentic = verdict.includes('AUTHENTIC');
  const isInconclusive = verdict.includes('INCONCLUSIVE');

  const confPercent = Math.round(assessment.overall_confidence * 100);

  return (
    <div className="space-y-6">
      {/* Primary Verdict Hero Banner */}
      <div
        className={`p-6 rounded-xl border transition-all ${
          isManipulated
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : isAuthentic
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isManipulated
                  ? 'bg-rose-600 text-white'
                  : isAuthentic
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {isManipulated ? (
                <ShieldAlert className="w-6 h-6" />
              ) : isAuthentic ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <HelpCircle className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase tracking-wider font-bold opacity-75">
                  Automated Forensic Preliminary Indicator
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/70 border border-current/20">
                  Status: {assessment.overall_status}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-0.5">{verdict}</h2>
              <p className="text-xs mt-1 opacity-90 max-w-2xl leading-relaxed">
                Aggregated from neural artifact detection, spatial gradient residuals, container EXIF metadata, and cryptographic provenance checks under Section 63 BSA standards.
              </p>
            </div>
          </div>

          {/* Probability Metric Pill */}
          <div className="bg-white/80 backdrop-blur rounded-lg p-3.5 border border-current/15 shrink-0 flex items-center space-x-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Synthetic Probability</p>
              <p className="text-2xl font-black text-slate-900 font-mono">{confPercent}%</p>
            </div>
            <div className="h-10 w-px bg-slate-200" />
            <button
              onClick={onGenerateReport}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Section 63 Report</span>
            </button>
          </div>
        </div>

        {/* Confidence Band Bar */}
        <div className="mt-5 pt-4 border-t border-current/10">
          <div className="flex justify-between text-[11px] font-semibold opacity-75 mb-1.5">
            <span>Calibrated Likelihood Gauge</span>
            <span>
              {confPercent >= 75 ? 'Likely Manipulated (≥75%)' : confPercent <= 30 ? 'Likely Authentic (≤30%)' : 'Inconclusive Band (31-74%)'}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-700 ${
                isManipulated ? 'bg-rose-500' : isAuthentic ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${confPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Structured Forensic Findings Narrative (M13) */}
      {narrative && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              {narrative.title}
            </h3>
            <span className="text-xs font-medium text-slate-500">M13 Human-Readable Translation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {narrative.sections.map((sec, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-50/70 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  {sec.heading}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{sec.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
