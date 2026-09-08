import React, { useState } from 'react';
import { ShieldCheck, Clock, User, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { AuditEvent } from '../types';

interface AuditLedgerProps {
  events: AuditEvent[];
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ events }) => {
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const modules = Array.from(new Set(events.map((e) => e.module_name)));
  const filtered = filterModule === 'ALL' ? events : events.filter((e) => e.module_name === filterModule);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Append-Only Forensic Audit Ledger (M14)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident chronological chain of custody log preserving all pipeline actions.
          </p>
        </div>

        {/* Module Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="text-xs rounded-md border border-slate-200 px-2 py-1 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Modules ({events.length})</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No audit events logged.</div>
        ) : (
          filtered.map((e) => {
            const isExpanded = expandedId === e.id;
            return (
              <div key={e.id} className="p-3.5 hover:bg-slate-50/70 transition text-xs">
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                >
                  <div className="flex items-start space-x-3">
                    <button className="mt-0.5 text-slate-400">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 font-mono">{e.event_type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {e.module_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Actor: {e.actor}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono text-[11px] text-slate-500 flex items-center gap-1 sm:justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(e.timestamp).toLocaleString()}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">ID: {e.id.substring(0, 16)}...</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 pl-6">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                      Event Cryptographic Context
                    </p>
                    <pre className="text-[10px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded overflow-x-auto max-h-36">
                      {JSON.stringify(e.event_detail, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
