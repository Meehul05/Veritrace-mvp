import React, { useState, useEffect } from 'react';
import { Network, Database, Shield, Camera, Cpu, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ProvenanceNode, ProvenanceEdge } from '../types';

interface ProvenanceGraphViewProps {
  evidenceId: string;
}

export const ProvenanceGraphView: React.FC<ProvenanceGraphViewProps> = ({ evidenceId }) => {
  const [nodes, setNodes] = useState<ProvenanceNode[]>([]);
  const [edges, setEdges] = useState<ProvenanceEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ProvenanceNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/provenance/${evidenceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          setSelectedNode(data.nodes?.[0] || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching provenance graph:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [evidenceId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
        Constructing Provenance DAG (M11)...
      </div>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ORIGINAL_EVIDENCE':
        return <Database className="w-4 h-4 text-sky-600" />;
      case 'SHA256_IDENTITY':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'METADATA_RECORD':
        return <Camera className="w-4 h-4 text-purple-600" />;
      case 'C2PA_MANIFEST':
        return <Shield className="w-4 h-4 text-indigo-600" />;
      case 'ML_INSPECTION_FRAME':
        return <Cpu className="w-4 h-4 text-rose-600" />;
      case 'EARLIEST_KNOWN_SOURCE':
        return <Globe className="w-4 h-4 text-amber-600" />;
      case 'OPEN_SOURCE_OCCURRENCE':
        return <Globe className="w-4 h-4 text-emerald-600" />;
      default:
        return <Network className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Network className="w-4 h-4 text-sky-600" />
            Provenance Directed Acyclic Graph (DAG) (M11)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic, hardware, and temporal chain of custody lineage.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Nodes: {nodes.length} | Edges: {edges.length}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Node Graph Diagram */}
        <div className="lg:col-span-7 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 overflow-y-auto max-h-[420px]">
          {nodes.map((n, idx) => {
            const isSelected = selectedNode?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => setSelectedNode(n)}
                className={`p-3.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {getNodeIcon(n.node_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{n.label}</p>
                    <p className="text-[10px] font-mono text-slate-500">{n.node_type}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">Step #{idx + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Node Inspector */}
        <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Node Attribute Inspector
          </p>

          {selectedNode ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Node Identifier</p>
                <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">{selectedNode.id}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">{selectedNode.label}</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Cryptographic &amp; State Payload
                </p>
                <pre className="text-[10px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded overflow-x-auto max-h-44">
                  {JSON.stringify(selectedNode.metadata, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select any node in the lineage to inspect payload.</p>
          )}
        </div>
      </div>
    </div>
  );
};
