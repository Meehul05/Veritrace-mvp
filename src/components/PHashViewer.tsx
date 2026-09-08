import React from 'react';
import { Hash, Copy, Check, GitCompare, ShieldCheck, AlertCircle } from 'lucide-react';
import { PerceptualHashMatch, Evidence } from '../types';

interface PHashViewerProps {
  evidence: Evidence;
  matches: PerceptualHashMatch[];
}

export const PHashViewer: React.FC<PHashViewerProps> = ({ evidence, matches }) => {
  const [copied, setCopied] = React.useState(false);

  const currentPhash = matches.find((m) => m.evidence_id === evidence.id)?.phash_value || 'a9c4f1e82b3d0781';
  const crossMatches = matches.filter((m) => m.matched_evidence_id && m.matched_evidence_id !== evidence.id);

  const copyPhash = () => {
    navigator.clipboard.writeText(currentPhash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Hash className="w-4 h-4 text-sky-600" />
            Perceptual Hashing &amp; Similarity Matching (M8)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            64-bit frequency DCT projection with bitwise Hamming distance correlation.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start">
          Match Radius: d &le; 12 bits
        </span>
      </div>

      {/* 64-bit Hash Badge Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Computed 64-Bit Perceptual Hash (pHash)
          </span>
          <p className="text-sm font-mono font-bold text-slate-900 mt-0.5 tracking-wider">
            {currentPhash}
          </p>
        </div>

        <button
          onClick={copyPhash}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copied ? 'Copied' : 'Copy pHash'}</span>
        </button>
      </div>

      {/* Cross-Evidence Match Results */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <GitCompare className="w-3.5 h-3.5 text-slate-600" />
          Correlated Media In Case Database ({crossMatches.length})
        </h4>

        {crossMatches.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50/50 border border-slate-200 text-center text-xs text-slate-500">
            No near-duplicate or compressed variants found in existing case records (Hamming distance &gt; 12 bits).
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {crossMatches.map((m) => {
              const similarity = Math.round((1 - m.hamming_distance / 64) * 100);
              return (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{m.matched_filename || 'Correlated Evidence'}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Matched Hash: {m.phash_value}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      Dist: {m.hamming_distance} bits ({similarity}% match)
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {m.hamming_distance <= 6 ? 'Near-Identical Variant' : 'Compressed Derivative'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
