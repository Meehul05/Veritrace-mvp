import React, { useState } from 'react';
import {
  Search,
  Globe,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Filter,
  Database,
  BookOpen,
  Newspaper,
  Code2,
  Sparkles,
  Lock,
  Compass,
} from 'lucide-react';
import { SearchResult, ResolvedSource } from '../types';

interface ReverseSearchPanelProps {
  evidenceId: string;
  searchResults: SearchResult[];
  resolvedSource?: ResolvedSource;
  onSearchCompleted: () => void;
}

export const ReverseSearchPanel: React.FC<ReverseSearchPanelProps> = ({
  evidenceId,
  searchResults,
  resolvedSource,
  onSearchCompleted,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const handleTriggerSearch = async () => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/reverse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: evidenceId,
          actor: 'Inspector V. Sharma (Examiner)',
          query: customQuery.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Open-source web tracking failed');
      }

      onSearchCompleted();
    } catch (err: any) {
      setError(err.message || 'Open-source web tracking query failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const filteredResults = searchResults.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'ACADEMIC')
      return r.source_type?.includes('Academic') || r.source_type?.includes('Research');
    if (selectedFilter === 'ENCYCLOPEDIA')
      return r.source_type?.includes('Encyclopedia') || r.source.includes('Wikipedia');
    if (selectedFilter === 'OPEN_SOURCE')
      return r.source_type?.includes('Open Source') || r.source.includes('GitHub');
    if (selectedFilter === 'NEWS')
      return r.source_type?.includes('News') || r.source_type?.includes('Journalism');
    if (selectedFilter === 'CREATIVE_COMMONS')
      return r.source_type?.includes('Creative Commons') || r.source.includes('Commons');
    return true;
  });

  const getSourceIcon = (sourceType?: string) => {
    if (sourceType?.includes('Academic')) return <Database className="w-3.5 h-3.5 text-indigo-600" />;
    if (sourceType?.includes('Encyclopedia')) return <BookOpen className="w-3.5 h-3.5 text-blue-600" />;
    if (sourceType?.includes('Open Source')) return <Code2 className="w-3.5 h-3.5 text-emerald-600" />;
    if (sourceType?.includes('News')) return <Newspaper className="w-3.5 h-3.5 text-amber-600" />;
    return <Globe className="w-3.5 h-3.5 text-sky-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header & Policy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600" />
              Open-Source Web Provenance &amp; Reverse Image Tracker
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Open Sources Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracks where this image and its visual counterparts are found across open public archives, research datasets, and encyclopedias.
          </p>
        </div>

        {resolvedSource && resolvedSource.resolution_status === 'RESOLVED' && (
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 self-start shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Earliest Baseline Resolved
          </span>
        )}
      </div>

      {/* Mandatory Investigator Safeguard & Privacy Assurance Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-3">
        <div className="flex items-start space-x-3">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Open-Source OSINT Compliance Protocol:</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                BSA Section 63 Strict
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Queries are strictly confined to publicly indexed open sources (Wikipedia, Wikimedia Commons, academic datasets like USC-SIPI/LAION/ImageNet, open-source repositories like GitHub, and public news archives). In accordance with privacy and evidentiary guidelines, <strong>private social media handles, personal profiles, and closed messaging channels are strictly excluded</strong>.
            </p>
          </div>
        </div>

        {/* Trigger Controls & Custom Query Input */}
        <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Optional keyword or domain (e.g. Lena Soderberg, Stanford Alpaca, dataset)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800"
            />
          </div>

          <button
            onClick={handleTriggerSearch}
            disabled={isSearching}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
          >
            {isSearching ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>{isSearching ? 'Scanning Open Sources...' : 'Track Across Open Web'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* M10 Earliest Resolved Source & Subject Card */}
      {resolvedSource && resolvedSource.resolution_status === 'RESOLVED' && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-sky-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100/60 pb-2">
            <div>
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-600" />
                Earliest Known Open-Web Baseline
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span>First Documented Appearance: {resolvedSource.earliest_indexed_at || 'Circa Historical Archive'}</span>
              </p>
            </div>

            {resolvedSource.earliest_source_name && (
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 self-start">
                Origin: {resolvedSource.earliest_source_name}
              </span>
            )}
          </div>

          {/* Identified Visual Subject */}
          {resolvedSource.identified_subject && (
            <div className="text-xs">
              <span className="text-[11px] font-semibold text-slate-500">Identified Subject / Visual Entity:</span>
              <p className="font-semibold text-slate-900 mt-0.5">{resolvedSource.identified_subject}</p>
            </div>
          )}

          {/* Historical Context & Origin Link */}
          {resolvedSource.earliest_context && (
            <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <span className="font-semibold text-slate-800">Historical &amp; Provenance Context: </span>
              {resolvedSource.earliest_context}
            </div>
          )}

          {/* Web Spread Summary */}
          {resolvedSource.web_spread_summary && (
            <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <span className="font-semibold text-slate-800">Open-Web Diffusion Pattern: </span>
              {resolvedSource.web_spread_summary}
            </div>
          )}

          {resolvedSource.earliest_url && (
            <div className="pt-1 flex items-center justify-between text-xs">
              <a
                href={resolvedSource.earliest_url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1.5"
              >
                <span>View Historical Documentation Record</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                Verified Open Public Domain
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter Chips & Matches Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            Open-Source Web Matches ({searchResults.length})
          </h4>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Filter className="w-3 h-3 text-slate-400 mr-0.5" />
            {[
              { id: 'ALL', label: 'All Sources' },
              { id: 'ACADEMIC', label: 'Academic / Research' },
              { id: 'ENCYCLOPEDIA', label: 'Encyclopedias' },
              { id: 'OPEN_SOURCE', label: 'Code & Data Repos' },
              { id: 'NEWS', label: 'News Archives' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  selectedFilter === f.id
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {searchResults.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-200 space-y-2">
            <Globe className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No open-source web track has been initiated yet.</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Click &quot;Track Across Open Web&quot; above to search Wikipedia, research archives, public stock galleries, and open-source datasets.
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-slate-200">
            No matches found for the selected category filter.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {filteredResults.map((r) => (
              <div
                key={r.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition text-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="flex items-center gap-1.5 font-bold text-slate-900">
                      {getSourceIcon(r.source_type)}
                      {r.source}
                    </span>

                    {r.source_type && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                        {r.source_type}
                      </span>
                    )}

                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200">
                      {Math.round((r.similarity_score || 0.9) * 100)}% visual similarity
                    </span>

                    {r.is_open_source && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Open Source
                      </span>
                    )}
                  </div>

                  {r.title && (
                    <p className="font-semibold text-slate-800 text-[11.5px]">{r.title}</p>
                  )}

                  {r.notes && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {r.notes}
                    </p>
                  )}

                  <a
                    href={r.matched_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 truncate pt-0.5"
                  >
                    <span className="truncate max-w-md">{r.matched_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>

                <div className="text-right text-[11px] text-slate-500 shrink-0 self-start sm:self-center">
                  <p className="font-semibold text-slate-700">
                    First indexed: {r.indexed_at?.substring(0, 10) || 'Archived'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Triggered by: {r.triggered_by}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

