import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle, Info, ChevronDown, ChevronRight, Key } from 'lucide-react';
import { C2PAManifest } from '../types';

interface C2PAViewerProps {
  manifest?: C2PAManifest;
}

export const C2PAViewer: React.FC<C2PAViewerProps> = ({ manifest }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!manifest) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
        No C2PA inspection data available.
      </div>
    );
  }

  const isValid = manifest.manifest_state === 'VALID';
  const isNotFound = manifest.manifest_state === 'NOT_FOUND';
  const isInvalid = manifest.manifest_state === 'INVALID';

  let rawJsonObj: Record<string, any> = {};
  try {
    rawJsonObj = JSON.parse(manifest.raw_manifest_json);
  } catch {}

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-600" />
            C2PA Content Credentials &amp; Cryptographic Manifest (M4)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic provenance inspection adhering to C2PA Coalition specification.
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isValid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isNotFound
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isValid ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          ) : isNotFound ? (
            <Info className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          )}
          {manifest.manifest_state}
        </span>
      </div>

      {/* Evidentiary Neutrality Notice */}
      {isNotFound && (
        <div className="p-3.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Evidentiary Neutrality Invariant:</span>
            <p className="mt-0.5 text-sky-800 leading-relaxed">
              Absence of a C2PA manifest is a neutral finding. Most direct camera sensors, web apps, and messaging platforms do not write or preserve C2PA JUMBF containers. This does not imply synthetic manipulation.
            </p>
          </div>
        </div>
      )}

      {/* Manifest Key Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Issuer Authority</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
            {manifest.issuer || 'None (Unsigned)'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Claim Generator</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
            {manifest.claim_generator || 'Not Specified'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Signature Validation</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5">
            {manifest.signature_valid === true ? 'Cryptographically Valid' : manifest.signature_valid === false ? 'Validation Failed' : 'N/A'}
          </p>
        </div>
      </div>

      {/* Raw Manifest Payload Toggle */}
      <div className="pt-2">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
        >
          {showRaw ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>View Raw JUMBF / C2PA Inspection JSON</span>
        </button>

        {showRaw && (
          <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
            {JSON.stringify(rawJsonObj, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
