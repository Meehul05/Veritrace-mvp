import React from 'react';
import { FileCode, FileVideo, ShieldAlert, ShieldCheck, HelpCircle, HardDrive } from 'lucide-react';
import { Evidence } from '../types';

interface EvidenceListProps {
  evidenceList: Evidence[];
  activeEvidenceId?: string;
  onSelectEvidence: (id: string) => void;
}

export const EvidenceList: React.FC<EvidenceListProps> = ({
  evidenceList,
  activeEvidenceId,
  onSelectEvidence,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          Ingested Evidence Repository ({evidenceList.length})
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">Write-Once Verified</span>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {evidenceList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No evidence ingested yet.</p>
        ) : (
          evidenceList.map((e) => {
            const isSelected = e.id === activeEvidenceId;
            return (
              <div
                key={e.id}
                onClick={() => onSelectEvidence(e.id)}
                className={`p-3 rounded-lg border transition cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-300'
                    : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    {e.media_type === 'video' ? (
                      <FileVideo className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <FileCode className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900 truncate">{e.original_filename}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {(e.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>SHA: {e.sha256.substring(0, 12)}...</span>
                  <span>{new Date(e.ingested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
