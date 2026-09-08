import { db } from './db';
import { AuditService } from './audit';
import { ProvenanceNode, ProvenanceEdge } from './types';

export class ProvenanceGraphService {
  /**
   * M11 Provenance Graph Builder.
   * Constructs a Directed Acyclic Graph (DAG) representing the complete evidence lifecycle.
   */
  static buildGraph(evidenceId: string): { nodes: ProvenanceNode[]; edges: ProvenanceEdge[] } {
    const evidence = db.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found.`);
    }

    const nodes: ProvenanceNode[] = [];
    const edges: ProvenanceEdge[] = [];

    // 1. Evidence root node
    const evNodeId = `node_ev_${evidenceId.substring(0, 8)}`;
    nodes.push({
      id: evNodeId,
      evidence_id: evidenceId,
      node_type: 'ORIGINAL_EVIDENCE',
      label: `Evidence: ${evidence.original_filename}`,
      metadata: {
        filename: evidence.original_filename,
        size_bytes: evidence.size_bytes,
        mime_type: evidence.mime_type,
        ingested_at: evidence.ingested_at,
      },
    });

    // 2. Exact-byte SHA-256 node
    const hashNodeId = `node_hash_${evidenceId.substring(0, 8)}`;
    nodes.push({
      id: hashNodeId,
      evidence_id: evidenceId,
      node_type: 'SHA256_IDENTITY',
      label: `SHA-256: ${evidence.sha256.substring(0, 16)}...`,
      metadata: {
        full_hash: evidence.sha256,
        exact_bytes: true,
      },
    });
    edges.push({
      id: `edge_hash_${evidenceId.substring(0, 8)}`,
      evidence_id: evidenceId,
      source: evNodeId,
      target: hashNodeId,
      relationship: 'cryptographically_identified_by',
      confidence: 1.0,
    });

    // 3. Metadata / Camera node
    const meta = db.getMetadataRecord(evidenceId);
    if (meta) {
      const metaNodeId = `node_meta_${evidenceId.substring(0, 8)}`;
      nodes.push({
        id: metaNodeId,
        evidence_id: evidenceId,
        node_type: 'METADATA_RECORD',
        label: `Device: ${meta.camera_model || 'No Camera Tag'}`,
        metadata: {
          camera_model: meta.camera_model,
          gps_present: meta.gps_present,
          captured_at: meta.captured_at,
          status: meta.extraction_status,
        },
      });
      edges.push({
        id: `edge_meta_${evidenceId.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: metaNodeId,
        relationship: 'metadata_extracted_from',
        confidence: meta.camera_model ? 1.0 : 0.5,
      });
    }

    // 4. C2PA node
    const c2pa = db.getC2PAManifest(evidenceId);
    if (c2pa) {
      const c2paNodeId = `node_c2pa_${evidenceId.substring(0, 8)}`;
      nodes.push({
        id: c2paNodeId,
        evidence_id: evidenceId,
        node_type: 'C2PA_MANIFEST',
        label: `C2PA: ${c2pa.manifest_state}`,
        metadata: {
          state: c2pa.manifest_state,
          issuer: c2pa.issuer,
          claim_generator: c2pa.claim_generator,
        },
      });
      edges.push({
        id: `edge_c2pa_${evidenceId.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: c2paNodeId,
        relationship: 'c2pa_attestation',
        confidence: c2pa.manifest_state === 'VALID' ? 1.0 : 0.3,
      });
    }

    // 5. ML Inspection Frames
    const frames = db.getFrameAnalyses(evidenceId);
    for (const f of frames) {
      const frameNodeId = `node_frame_${f.id.substring(0, 8)}`;
      nodes.push({
        id: frameNodeId,
        evidence_id: evidenceId,
        node_type: 'ML_INSPECTION_FRAME',
        label: `Frame #${f.frame_index} (${f.confidence_band})`,
        metadata: {
          frame_index: f.frame_index,
          score: f.ml_score,
          band: f.confidence_band,
          model: f.model_name,
        },
      });
      edges.push({
        id: `edge_frame_${f.id.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: frameNodeId,
        relationship: 'frame_sampled_from',
        confidence: 1.0,
      });
    }

    // 6. Perceptual matches
    const phashMatches = db.getPerceptualHashMatches(evidenceId);
    for (const pm of phashMatches) {
      const pmNodeId = `node_phash_${pm.id.substring(0, 8)}`;
      nodes.push({
        id: pmNodeId,
        evidence_id: evidenceId,
        node_type: 'PERCEPTUAL_MATCH',
        label: `Match: ${pm.matched_filename} (d=${pm.hamming_distance})`,
        metadata: {
          matched_evidence_id: pm.matched_evidence_id,
          distance: pm.hamming_distance,
        },
      });
      edges.push({
        id: `edge_phash_${pm.id.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: pmNodeId,
        relationship: 'perceptually_similar_to',
        confidence: Math.max(0, 1 - pm.hamming_distance / 64),
      });
    }

    // 7. Earliest resolved open-source baseline
    const resolved = db.getResolvedSource(evidenceId);
    if (resolved && resolved.resolution_status === 'RESOLVED') {
      const srcNodeId = `node_src_${resolved.id.substring(0, 8)}`;
      const sourceLabel = resolved.earliest_source_name
        ? `Baseline: ${resolved.earliest_source_name} (${resolved.earliest_indexed_at?.substring(0, 10)})`
        : `Earliest Source: ${resolved.earliest_indexed_at?.substring(0, 10)}`;

      nodes.push({
        id: srcNodeId,
        evidence_id: evidenceId,
        node_type: 'EARLIEST_KNOWN_SOURCE',
        label: sourceLabel,
        metadata: {
          earliest_indexed_at: resolved.earliest_indexed_at,
          source_name: resolved.earliest_source_name,
          subject: resolved.identified_subject,
          url: resolved.earliest_url,
          status: resolved.resolution_status,
          open_source_only: true,
        },
      });
      edges.push({
        id: `edge_src_${resolved.id.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: srcNodeId,
        relationship: 'earliest_known_indexed_appearance',
        confidence: 0.95,
      });
    }

    // 8. Open-Source Web Occurrences
    const searchResults = db.getSearchResults(evidenceId);
    for (const sr of searchResults.slice(0, 4)) {
      const srNodeId = `node_sr_${sr.id.substring(0, 8)}`;
      nodes.push({
        id: srNodeId,
        evidence_id: evidenceId,
        node_type: 'OPEN_SOURCE_OCCURRENCE',
        label: `${sr.source}: ${sr.title?.substring(0, 24) || 'Indexed Asset'}`,
        metadata: {
          source: sr.source,
          source_type: sr.source_type,
          url: sr.matched_url,
          similarity: sr.similarity_score,
          first_seen: sr.indexed_at,
          is_open_source: true,
        },
      });
      edges.push({
        id: `edge_sr_${sr.id.substring(0, 8)}`,
        evidence_id: evidenceId,
        source: evNodeId,
        target: srNodeId,
        relationship: 'indexed_open_source_occurrence',
        confidence: sr.similarity_score || 0.9,
      });
    }

    db.setProvenanceGraph(evidenceId, nodes, edges);

    AuditService.logEvent(
      'System',
      'ProvenanceGraphService',
      'GRAPH_CONSTRUCTED',
      { nodes_count: nodes.length, edges_count: edges.length },
      evidenceId
    );

    return { nodes, edges };
  }
}
