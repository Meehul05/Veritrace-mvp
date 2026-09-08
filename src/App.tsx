import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Layers,
  Cpu,
  Key,
  Camera,
  Hash,
  Network,
  Globe,
  Clock,
  RefreshCw,
  HardDrive,
  Scale,
} from 'lucide-react';

import {
  Evidence,
  Investigation,
  AnalysisDetailsResponse,
} from './types';

import { Header } from './components/Header';
import { IngestionZone } from './components/IngestionZone';
import { EvidenceList } from './components/EvidenceList';
import { AssessmentOverview } from './components/AssessmentOverview';
import { MLArtifactViewer } from './components/MLArtifactViewer';
import { C2PAViewer } from './components/C2PAViewer';
import { MetadataViewer } from './components/MetadataViewer';
import { PHashViewer } from './components/PHashViewer';
import { ProvenanceGraphView } from './components/ProvenanceGraphView';
import { ReverseSearchPanel } from './components/ReverseSearchPanel';
import { AuditLedger } from './components/AuditLedger';
import { BsaReportModal } from './components/BsaReportModal';

export default function App() {
  const [investigation, setInvestigation] = useState<Investigation | undefined>(undefined);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | undefined>(undefined);
  const [analysisData, setAnalysisData] = useState<AnalysisDetailsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'ml' | 'c2pa' | 'metadata' | 'phash' | 'provenance' | 'reverse_search' | 'audit'
  >('overview');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Initial load
  useEffect(() => {
    fetchInvestigations();
    fetchEvidenceList();
  }, []);

  const fetchInvestigations = async () => {
    try {
      const res = await fetch('/api/v1/investigations');
      const data = await res.json();
      if (data.investigations && data.investigations.length > 0) {
        setInvestigation(data.investigations[0]);
      }
    } catch (err) {
      console.error('Failed to load investigation:', err);
    }
  };

  const fetchEvidenceList = async () => {
    try {
      const res = await fetch('/api/v1/evidence');
      const data = await res.json();
      const list: Evidence[] = data.evidence || [];
      setEvidenceList(list);
      if (list.length > 0 && !activeEvidenceId) {
        setActiveEvidenceId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load evidence list:', err);
    }
  };

  // Load detailed analysis whenever active evidence changes
  useEffect(() => {
    if (!activeEvidenceId) {
      setAnalysisData(null);
      return;
    }

    setLoadingAnalysis(true);
    fetch(`/api/v1/analysis/${activeEvidenceId}`)
      .then((res) => res.json())
      .then((data: AnalysisDetailsResponse) => {
        setAnalysisData(data);
        setLoadingAnalysis(false);
      })
      .catch((err) => {
        console.error('Failed to fetch analysis:', err);
        setLoadingAnalysis(false);
      });
  }, [activeEvidenceId]);

  const handleIngestSuccess = (newEv: Evidence) => {
    setEvidenceList((prev) => [newEv, ...prev]);
    setActiveEvidenceId(newEv.id);
    setActiveTab('overview');
  };

  const refreshCurrentAnalysis = () => {
    if (!activeEvidenceId) return;
    setLoadingAnalysis(true);
    fetch(`/api/v1/analysis/${activeEvidenceId}`)
      .then((res) => res.json())
      .then((data: AnalysisDetailsResponse) => {
        setAnalysisData(data);
        setLoadingAnalysis(false);
      });
  };

  const tabs = [
    { id: 'overview', label: 'Forensic Overview', icon: Scale },
    { id: 'ml', label: 'Neural Artifacts (M6/M7)', icon: Cpu },
    { id: 'c2pa', label: 'C2PA Credentials (M4)', icon: Key },
    { id: 'metadata', label: 'Technical EXIF (M3)', icon: Camera },
    { id: 'phash', label: 'Perceptual Hash (M8)', icon: Hash },
    { id: 'provenance', label: 'Provenance DAG (M11)', icon: Network },
    { id: 'reverse_search', label: 'Public Index Search (M9/M10)', icon: Globe },
    { id: 'audit', label: 'Audit Ledger (M14)', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col">
      <Header investigation={investigation} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Evidence Ingestion Zone */}
        <IngestionZone
          onIngestSuccess={handleIngestSuccess}
          investigationId={investigation?.id || 'inv_default_001'}
        />

        {/* Master Details Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar: Repository List */}
          <div className="lg:col-span-4 space-y-4">
            <EvidenceList
              evidenceList={evidenceList}
              activeEvidenceId={activeEvidenceId}
              onSelectEvidence={(id) => setActiveEvidenceId(id)}
            />

            {/* Active Evidence Snapshot */}
            {analysisData && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold uppercase tracking-wider text-slate-500">
                    Active Chain of Custody
                  </span>
                  <button
                    onClick={refreshCurrentAnalysis}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                    title="Refresh analysis state"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px] text-slate-600">
                  <p className="truncate">
                    <span className="text-slate-400 font-sans">File:</span> {analysisData.evidence.original_filename}
                  </p>
                  <p className="truncate">
                    <span className="text-slate-400 font-sans">SHA-256:</span> {analysisData.evidence.sha256}
                  </p>
                  <p>
                    <span className="text-slate-400 font-sans">Size:</span> {(analysisData.evidence.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p>
                    <span className="text-slate-400 font-sans">Ingested:</span> {new Date(analysisData.evidence.ingested_at).toLocaleString()}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="w-full py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Generate Section 63 BSA Report</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Main Panel: Comprehensive Forensic Modules */}
          <div className="lg:col-span-8 space-y-4">
            {analysisData ? (
              <>
                {/* Forensic Navigation Tabs */}
                <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
                  {tabs.map((t) => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Views */}
                {loadingAnalysis ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                    <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading forensic verification data...</p>
                  </div>
                ) : (
                  <>
                    {activeTab === 'overview' && (
                      <AssessmentOverview
                        evidence={analysisData.evidence}
                        assessment={analysisData.assessment}
                        narrative={analysisData.narrative}
                        onGenerateReport={() => setIsReportModalOpen(true)}
                      />
                    )}

                    {activeTab === 'ml' && (
                      <MLArtifactViewer
                        evidence={analysisData.evidence}
                        frames={analysisData.frames}
                        onReanalyzed={refreshCurrentAnalysis}
                      />
                    )}

                    {activeTab === 'c2pa' && (
                      <C2PAViewer manifest={analysisData.c2pa} />
                    )}

                    {activeTab === 'metadata' && (
                      <MetadataViewer metadata={analysisData.metadata} />
                    )}

                    {activeTab === 'phash' && (
                      <PHashViewer
                        evidence={analysisData.evidence}
                        matches={analysisData.phash_matches}
                      />
                    )}

                    {activeTab === 'provenance' && (
                      <ProvenanceGraphView evidenceId={analysisData.evidence.id} />
                    )}

                    {activeTab === 'reverse_search' && (
                      <ReverseSearchPanel
                        evidenceId={analysisData.evidence.id}
                        searchResults={analysisData.search_results}
                        resolvedSource={analysisData.resolved_source}
                        onSearchCompleted={refreshCurrentAnalysis}
                      />
                    )}

                    {activeTab === 'audit' && (
                      <AuditLedger
                        events={analysisData.jobs.map((j) => ({
                          id: j.id,
                          evidence_id: j.evidence_id,
                          actor: 'System / Automated Pipeline',
                          module_name: j.module_name,
                          event_type: `PIPELINE_${j.status}`,
                          event_detail: {
                            status: j.status,
                            version: j.pipeline_version,
                            error: j.error_detail,
                          },
                          timestamp: j.completed_at || j.started_at,
                        }))}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No Evidence Selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Upload an evidence file above or select one from the repository to initiate Section 63 BSA forensic analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Section 63 BSA Report Modal */}
      {isReportModalOpen && analysisData && (
        <BsaReportModal
          evidence={analysisData.evidence}
          investigation={investigation}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
}
