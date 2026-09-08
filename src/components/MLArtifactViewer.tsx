import React, { useState } from 'react';
import {
  Flame,
  Layers,
  Info,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Cpu,
  Sparkles,
  Compass,
  Camera,
  Sliders,
  RefreshCw,
  FileCheck2,
  ScanEye,
  SunMedium,
  UserCheck
} from 'lucide-react';
import { Evidence, FrameAnalysis } from '../types';

interface MLArtifactViewerProps {
  evidence: Evidence;
  frames: FrameAnalysis[];
  onReanalyzed?: () => void;
}

export const MLArtifactViewer: React.FC<MLArtifactViewerProps> = ({
  evidence,
  frames,
  onReanalyzed,
}) => {
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Calibration controls
  const [selectedEngine, setSelectedEngine] = useState<string>('ensemble');
  const [threshold, setThreshold] = useState<number>(0.50);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  if (!frames || frames.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">No Frame Inference Generated</h3>
        <p className="text-xs text-slate-500 mt-1">
          Machine learning inference module was skipped or produced no frame records.
        </p>
      </div>
    );
  }

  const currentFrame = frames[selectedFrameIndex] || frames[0];
  const isManipulated = currentFrame.confidence_band === 'LIKELY_MANIPULATED';
  const isAuthentic = currentFrame.confidence_band === 'LIKELY_AUTHENTIC';

  const origImageUrl = `/api/v1/evidence/${evidence.id}/file`;
  const heatmapUrl = currentFrame.heatmap_artifact_id
    ? `/api/v1/artifacts/${currentFrame.heatmap_artifact_id}`
    : origImageUrl;

  const syntheticProb = currentFrame.ml_score;
  const authenticProb = 1 - currentFrame.ml_score;
  const detectedSource = currentFrame.detected_source || 'Camera Sensor / Authentic';
  const breakdown = currentFrame.source_breakdown;

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setReanalyzeError(null);
    try {
      const resp = await fetch(`/api/v1/evidence/${evidence.id}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: selectedEngine,
          threshold,
          actor: 'Investigating Officer',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to reanalyze');
      }

      if (onReanalyzed) {
        onReanalyzed();
      }
    } catch (err: any) {
      setReanalyzeError(err.message || 'Re-analysis failed');
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600" />
            Multimodal Forensic Intelligence &amp; Neural Inference (M6 / M7)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Combines Google Gemini Multimodal Vision with Swin-B Shifted-Window Transformer, physical Error Level Analysis (ELA), and source attribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentFrame.quality_flag !== 'OK' ? (
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Flag: {currentFrame.quality_flag}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Signal Quality: OK
            </span>
          )}
        </div>
      </div>

      {/* Model & Sensitivity Calibration Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Engine Selector */}
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-600" />
              Analysis Engine
            </label>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ensemble">
                Multimodal Forensic Ensemble (Gemini Vision + Swin-B + ELA) [Recommended]
              </option>
              <option value="gemini_vision">
                Gemini Multimodal Forensic Vision (Deep Visual Reasoning &amp; Optics)
              </option>
              <option value="swin_transformer">
                Swin-Base Shifted-Window Transformer (Local Neural Model)
              </option>
              <option value="source_attribution">
                Generative Source Classifier (Midjourney / SD / DALL-E)
              </option>
            </select>
          </div>

          {/* Threshold Slider */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Decision Threshold
              </label>
              <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {threshold.toFixed(2)} (
                {threshold <= 0.40 ? 'Strict Court Standard' : threshold >= 0.60 ? 'Permissive' : 'Balanced'})
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.70"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>0.30 (Strict)</span>
              <span>0.50 (Standard)</span>
              <span>0.70 (Permissive)</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="w-full md:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              {isReanalyzing ? 'Evaluating Evidence...' : 'Re-analyze Evidence'}
            </button>
          </div>
        </div>

        {reanalyzeError && (
          <p className="text-xs text-rose-600 mt-2 font-medium">Error: {reanalyzeError}</p>
        )}
      </div>

      {/* Frame Visualizer & Heatmap Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Canvas Area */}
        <div className="lg:col-span-7 bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800 flex flex-col items-center justify-center min-h-[360px] p-2">
          {/* Controls Bar */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur text-[11px] font-mono font-semibold text-white border border-slate-700">
              Frame #{currentFrame.frame_index} ({currentFrame.timestamp_ms}ms)
            </span>

            <div className="pointer-events-auto flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setShowHeatmap(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                  !showHeatmap ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                Original Evidence
              </button>
              <button
                type="button"
                onClick={() => setShowHeatmap(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                  showHeatmap ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" />
                M7 ELA Heatmap
              </button>
            </div>
          </div>

          {/* Visual Layer */}
          <div className="relative w-full h-full flex items-center justify-center max-h-[380px] p-4">
            <img
              src={showHeatmap ? heatmapUrl : origImageUrl}
              alt="Evidence Visual"
              className="max-h-[340px] max-w-full object-contain rounded border border-slate-800 shadow-lg"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          </div>

          {/* Heatmap Legend */}
          {showHeatmap && (
            <div className="w-full mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-3 font-mono">
              <span>Low Compression Error (Natural Sensor)</span>
              <div className="h-2 w-32 rounded bg-gradient-to-r from-slate-900 via-amber-500 to-rose-600" />
              <span>High Error / Latent Grid</span>
            </div>
          )}
        </div>

        {/* Model Outputs & Attribution Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          {/* Classification Confidence Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Forensic Confidence &amp; Scoring</span>
              <span className="font-mono text-[11px] text-slate-400 font-normal">
                {currentFrame.model_name.split(' ')[0]}
              </span>
            </p>

            <div className="space-y-2 mb-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                    Synthetic / AI Manipulated Score
                  </span>
                  <span className="font-mono font-bold text-rose-900">
                    {(syntheticProb * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, syntheticProb * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                    Authentic Camera Capture Score
                  </span>
                  <span className="font-mono font-bold text-emerald-900">
                    {(authenticProb * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, authenticProb * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Assigned Verdict Band:</span>
              <span
                className={`font-bold font-mono px-2.5 py-1 rounded text-xs ${
                  isManipulated
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isAuthentic
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {currentFrame.confidence_band}
              </span>
            </div>
          </div>

          {/* Generative Source Attribution Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                Detected Origin / Generator
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {detectedSource}
              </span>
            </div>

            {breakdown && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" /> Midjourney:
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(breakdown.midjourney * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-500" /> Stable Diffusion / Flux:
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(breakdown.stable_diffusion * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> DALL-E 3:
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(breakdown.dalle * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-emerald-600" /> Physical Camera Sensor:
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {(breakdown.real * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Physical Signals & ELA */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Error Level Analysis (ELA):</span>
              <span className="font-semibold text-slate-800">
                {currentFrame.ela_score !== undefined ? currentFrame.ela_score.toFixed(4) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Spectral Variance (Laplacian):</span>
              <span className="font-semibold text-slate-800">
                {currentFrame.spectral_score !== undefined ? currentFrame.spectral_score.toFixed(4) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Examiner Observations & Anomalies Section */}
      {currentFrame.forensic_justification && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              Section 63 BSA Forensic Examination Rationale
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Engine: {currentFrame.engine_used || 'ensemble'}
            </span>
          </div>

          {/* Anomalies List */}
          {currentFrame.anomalies && currentFrame.anomalies.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Identified Artifacts &amp; Discrepancies:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentFrame.anomalies.map((anom, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    {anom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Forensic Narrative */}
          <div className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200 font-sans">
            <p className="font-semibold text-slate-800 mb-1">Examiner Assessment:</p>
            {currentFrame.forensic_justification}
          </div>

          {/* 3 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {currentFrame.sensor_analysis && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <ScanEye className="w-3.5 h-3.5 text-sky-600" />
                  Sensor &amp; Optics
                </p>
                <p className="text-slate-600 text-[11px] leading-normal">
                  {currentFrame.sensor_analysis}
                </p>
              </div>
            )}

            {currentFrame.lighting_analysis && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <SunMedium className="w-3.5 h-3.5 text-amber-600" />
                  Lighting Physics
                </p>
                <p className="text-slate-600 text-[11px] leading-normal">
                  {currentFrame.lighting_analysis}
                </p>
              </div>
            )}

            {currentFrame.anatomy_analysis && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Anatomy &amp; Texture
                </p>
                <p className="text-slate-600 text-[11px] leading-normal">
                  {currentFrame.anatomy_analysis}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
