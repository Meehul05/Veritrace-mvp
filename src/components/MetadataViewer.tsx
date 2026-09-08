import React, { useState } from 'react';
import { Camera, MapPin, Calendar, Database, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { MetadataRecord } from '../types';

interface MetadataViewerProps {
  metadata?: MetadataRecord;
}

export const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  if (!metadata) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
        No technical EXIF metadata record found.
      </div>
    );
  }

  let exifObj: Record<string, any> = {};
  try {
    exifObj = JSON.parse(metadata.exif_json);
  } catch {}

  const filteredKeys = Object.keys(exifObj).filter((k) =>
    k.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(exifObj[k]).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-600" />
            Technical Container &amp; EXIF Metadata (M3)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hardware capture attributes, sensor parameters, and embedded timestamps.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start">
          Extraction: {metadata.extraction_status}
        </span>
      </div>

      {/* Hardware Snapshot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-2.5">
          <Camera className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Device Hardware</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
              {metadata.camera_model || 'No EXIF Model Tag'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-2.5">
          <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Capture Timestamp</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
              {metadata.captured_at ? new Date(metadata.captured_at).toLocaleString() : 'Not recorded in headers'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-2.5">
          <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">GPS Geolocation</p>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              {metadata.gps_present ? 'Coordinates Tagged' : 'No GPS Metadata'}
            </p>
          </div>
        </div>
      </div>

      {/* Filterable Raw EXIF Table */}
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition"
          >
            {showRaw ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>Inspect All Extracted Tags ({Object.keys(exifObj).length})</span>
          </button>

          {showRaw && (
            <div className="relative">
              <input
                type="text"
                placeholder="Filter tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          )}
        </div>

        {showRaw && (
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-600 w-1/3">Tag</th>
                  <th className="py-2 px-3 font-semibold text-slate-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-center text-slate-400">
                      No matching tags.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((key) => (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="py-1.5 px-3 text-slate-700 font-medium">{key}</td>
                      <td className="py-1.5 px-3 text-slate-900 break-all">
                        {typeof exifObj[key] === 'object' ? JSON.stringify(exifObj[key]) : String(exifObj[key])}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
