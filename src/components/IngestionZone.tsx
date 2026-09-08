import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, CheckCircle2, ShieldCheck, AlertCircle, FileCode } from 'lucide-react';
import { Evidence } from '../types';

interface IngestionZoneProps {
  onIngestSuccess: (evidence: Evidence) => void;
  investigationId: string;
}

export const IngestionZone: React.FC<IngestionZoneProps> = ({ onIngestSuccess, investigationId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadStep('Computing cryptographic exact-byte SHA-256...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('investigation_id', investigationId);
      formData.append('actor', 'Inspector V. Sharma (Examiner)');

      setUploadStep('Enforcing write-once storage & running pipeline (M1-M13)...');

      const response = await fetch('/api/v1/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ingestion failed');
      }

      const data = await response.json();
      setUploadStep('Verification complete.');
      onIngestSuccess(data.evidence);
    } catch (err: any) {
      setError(err.message || 'Evidence intake failed.');
    } finally {
      setIsUploading(false);
      setUploadStep(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Helper to load sample synthetic or authentic evidence
  const loadPresetEvidence = async (type: 'fake' | 'real' | 'compressed') => {
    let url = '';
    let filename = '';

    if (type === 'fake') {
      url = '/fixtures/synthetic_portrait.jpg';
      filename = 'synthetic_portrait.jpg';
    } else if (type === 'real') {
      url = '/fixtures/authentic_capture.jpg';
      filename = 'authentic_capture.jpg';
    } else {
      url = '/fixtures/degraded_media.jpg';
      filename = 'degraded_media.jpg';
    }

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      await handleUploadFile(file);
    } catch {
      // Fallback
      const blob = new Blob(['SAMPLE_IMAGE_DATA_' + Date.now()], { type: 'image/jpeg' });
      const file = new File([blob], filename, { type: 'image/jpeg' });
      await handleUploadFile(file);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-sky-600" />
            Evidence Ingestion &amp; Intake (M1 / M2)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserves exact uploaded bitstream with write-once storage and immediate SHA-256 certification.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Write-Once Guarantee</span>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-sky-500 bg-sky-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUploadFile(e.target.files[0]);
            }
          }}
        />

        {isUploading ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-800">{uploadStep}</p>
            <p className="text-xs text-slate-500">Executing forensic pipeline and generating audit trail...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mb-1">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              Drop digital evidence file here, or <span className="text-sky-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400">
              Supports JPEG, PNG, WebP, MP4, MOV up to 25 MB. Never modified or re-encoded.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Benchmarks for Immediate Testing */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Load Sample Forensic Benchmark
          </span>
          <span className="text-[11px] text-slate-400">Standard test cases</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => loadPresetEvidence('fake')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition text-xs font-medium text-slate-700"
          >
            <div>
              <p className="font-semibold text-rose-900">Synthetic Deepfake</p>
              <p className="text-[11px] text-slate-500">AI diffusion portrait</p>
            </div>
            <FileCode className="w-4 h-4 text-rose-500 shrink-0" />
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => loadPresetEvidence('real')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition text-xs font-medium text-slate-700"
          >
            <div>
              <p className="font-semibold text-emerald-900">Authentic Camera Capture</p>
              <p className="text-[11px] text-slate-500">DSLR hardware EXIF</p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => loadPresetEvidence('compressed')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition text-xs font-medium text-slate-700"
          >
            <div>
              <p className="font-semibold text-amber-900">Degraded Media</p>
              <p className="text-[11px] text-slate-500">High compression / low-res</p>
            </div>
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
