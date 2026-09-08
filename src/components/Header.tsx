import React from 'react';
import { Shield, ShieldAlert, Cpu, FileCheck2, Scale, Clock, Activity } from 'lucide-react';
import { Investigation } from '../types';

interface HeaderProps {
  investigation?: Investigation;
  mlProvider?: {
    name: string;
    version: string;
    status: string;
    device: string;
    runtime?: string;
  };
  onOpenCaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ investigation, mlProvider, onOpenCaseModal }) => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Mandate */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm ring-1 ring-slate-800">
            <Scale className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">VeriTrace</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                Sec. 63 BSA 2023
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200">
                v1.2.0-lock
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Evidence-Grade Deepfake &amp; Digital Provenance Verification Engine
            </p>
          </div>
        </div>

        {/* Active Case & ML Engine Context */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* ML Provider Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-sky-50 border border-sky-200 text-sky-900 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="font-semibold">
              {mlProvider?.name?.includes('GenD') ? 'GenD-DINOv3-L' : 'Hybrid ML'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-200/60 font-mono text-sky-800">
              {mlProvider?.device || 'CPU'}
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium">Case:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {investigation?.case_number || 'BSA-CYBER-2026-0842'}
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium">Officer:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
              {investigation?.investigating_officer || 'Insp. V. Sharma'}
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Audit Ledger Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
