import uuid
import json
from datetime import datetime, timezone
from backend.database import get_db
from backend.services.audit_service import AuditService

class ProvenanceGraphService:
    """
    M11 Provenance Graph Builder.
    Constructs a directed acyclic graph (DAG) connecting evidence nodes, hashes,
    EXIF capture, C2PA claims, derived frames, pHash matches, and resolved sources.
    Stores nodes into `provenance_nodes` and edges into `provenance_edges`.
    """

    @staticmethod
    def build_graph(evidence_id: str) -> dict:
        nodes = []
        edges = []

        with get_db() as conn:
            # 1. Evidence root node
            ev = conn.execute("SELECT * FROM evidence WHERE id = ?", (evidence_id,)).fetchone()
            if not ev:
                raise ValueError(f"Evidence {evidence_id} not found.")

            ev_node_id = f"node_evidence_{evidence_id[:8]}"
            nodes.append({
                "id": ev_node_id,
                "node_type": "ORIGINAL_EVIDENCE",
                "label": f"Evidence: {ev['original_filename']}",
                "metadata": {
                    "filename": ev["original_filename"],
                    "mime_type": ev["mime_type"],
                    "size_bytes": ev["size_bytes"],
                    "ingested_at": ev["ingested_at"]
                }
            })

            # 2. Cryptographic Hash Node
            hash_node_id = f"node_hash_{evidence_id[:8]}"
            nodes.append({
                "id": hash_node_id,
                "node_type": "SHA256_IDENTITY",
                "label": f"SHA-256: {ev['sha256'][:16]}...",
                "metadata": {
                    "full_hash": ev["sha256"],
                    "algorithm": "SHA-256",
                    "exact_bytes": True
                }
            })
            edges.append({
                "id": f"edge_hash_{evidence_id[:8]}",
                "source": ev_node_id,
                "target": hash_node_id,
                "relationship": "cryptographically_identified_by",
                "confidence": 1.0
            })

            # 3. Metadata / Camera Node
            meta = conn.execute("SELECT * FROM metadata_records WHERE evidence_id = ?", (evidence_id,)).fetchone()
            if meta:
                meta_node_id = f"node_meta_{evidence_id[:8]}"
                exif_obj = json.loads(meta["exif_json"]) if meta["exif_json"] else {}
                camera_label = meta["camera_model"] or "No Camera Model Tag"
                nodes.append({
                    "id": meta_node_id,
                    "node_type": "METADATA_RECORD",
                    "label": f"Device: {camera_label}",
                    "metadata": {
                        "camera_model": meta["camera_model"],
                        "gps_present": bool(meta["gps_present"]),
                        "captured_at": meta["captured_at"],
                        "resolution": f"{exif_obj.get('width', '?')}x{exif_obj.get('height', '?')}",
                        "status": meta["extraction_status"]
                    }
                })
                edges.append({
                    "id": f"edge_meta_{evidence_id[:8]}",
                    "source": ev_node_id,
                    "target": meta_node_id,
                    "relationship": "metadata_extracted_from",
                    "confidence": 1.0 if meta["camera_model"] else 0.5
                })

            # 4. C2PA Node
            c2pa = conn.execute("SELECT * FROM c2pa_manifests WHERE evidence_id = ?", (evidence_id,)).fetchone()
            if c2pa:
                c2pa_node_id = f"node_c2pa_{evidence_id[:8]}"
                nodes.append({
                    "id": c2pa_node_id,
                    "node_type": "C2PA_MANIFEST",
                    "label": f"C2PA: {c2pa['manifest_state']}",
                    "metadata": {
                        "manifest_state": c2pa["manifest_state"],
                        "claim_generator": c2pa["claim_generator"],
                        "signature_valid": bool(c2pa["signature_valid"]) if c2pa["signature_valid"] is not None else None
                    }
                })
                edges.append({
                    "id": f"edge_c2pa_{evidence_id[:8]}",
                    "source": ev_node_id,
                    "target": c2pa_node_id,
                    "relationship": "c2pa_attestation",
                    "confidence": 1.0 if c2pa["manifest_state"] == "VALID" else 0.3
                })

            # 5. ML Analysis Frames
            frames = conn.execute(
                "SELECT * FROM frame_analyses WHERE evidence_id = ? ORDER BY frame_index ASC",
                (evidence_id,)
            ).fetchall()
            for f in frames:
                f_node_id = f"node_frame_{f['id'][:8]}"
                nodes.append({
                    "id": f_node_id,
                    "node_type": "ML_INSPECTION_FRAME",
                    "label": f"Frame #{f['frame_index']} ({f['confidence_band']})",
                    "metadata": {
                        "frame_index": f["frame_index"],
                        "timestamp_ms": f["timestamp_ms"],
                        "ml_score": f["ml_score"],
                        "confidence_band": f["confidence_band"],
                        "model_name": f["model_name"]
                    }
                })
                edges.append({
                    "id": f"edge_frame_{f['id'][:8]}",
                    "source": ev_node_id,
                    "target": f_node_id,
                    "relationship": "frame_sampled_from",
                    "confidence": 1.0
                })

            # 6. pHash Matches
            p_matches = conn.execute(
                """
                SELECT p.*, e.original_filename as matched_name
                FROM perceptual_hash_matches p
                LEFT JOIN evidence e ON e.id = p.matched_evidence_id
                WHERE p.evidence_id = ? AND p.matched_evidence_id IS NOT NULL
                """,
                (evidence_id,)
            ).fetchall()
            for pm in p_matches:
                pm_node_id = f"node_phash_match_{pm['id'][:8]}"
                nodes.append({
                    "id": pm_node_id,
                    "node_type": "PERCEPTUAL_MATCH",
                    "label": f"Match: {pm['matched_name']} (d={pm['hamming_distance']})",
                    "metadata": {
                        "matched_evidence_id": pm["matched_evidence_id"],
                        "hamming_distance": pm["hamming_distance"],
                        "phash": pm["phash_value"]
                    }
                })
                edges.append({
                    "id": f"edge_phash_{pm['id'][:8]}",
                    "source": ev_node_id,
                    "target": pm_node_id,
                    "relationship": "perceptually_similar_to",
                    "confidence": max(0.0, 1.0 - (pm["hamming_distance"] / 64.0))
                })

            # 7. Resolved Earliest Source
            res_source = conn.execute(
                "SELECT * FROM resolved_sources WHERE evidence_id = ?", (evidence_id,)
            ).fetchone()
            if res_source and res_source["resolution_status"] == "RESOLVED":
                src_node_id = f"node_source_{res_source['id'][:8]}"
                nodes.append({
                    "id": src_node_id,
                    "node_type": "EARLIEST_KNOWN_SOURCE",
                    "label": f"Earliest Source: {res_source['earliest_indexed_at']}",
                    "metadata": {
                        "earliest_indexed_at": res_source["earliest_indexed_at"],
                        "status": res_source["resolution_status"]
                    }
                })
                edges.append({
                    "id": f"edge_source_{res_source['id'][:8]}",
                    "source": ev_node_id,
                    "target": src_node_id,
                    "relationship": "earliest_known_indexed_appearance",
                    "confidence": 0.85
                })

            # Clear previous nodes and edges for this evidence and persist
            conn.execute("DELETE FROM provenance_nodes WHERE evidence_id = ?", (evidence_id,))
            conn.execute("DELETE FROM provenance_edges WHERE evidence_id = ?", (evidence_id,))

            for n in nodes:
                conn.execute(
                    """
                    INSERT INTO provenance_nodes (id, evidence_id, node_type, label, metadata_json)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (n["id"], evidence_id, n["node_type"], n["label"], json.dumps(n["metadata"]))
                )
            for e in edges:
                conn.execute(
                    """
                    INSERT INTO provenance_edges (id, evidence_id, source_node_id, target_node_id, relationship, confidence)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (e["id"], evidence_id, e["source"], e["target"], e["relationship"], e["confidence"])
                )

        AuditService.log_event(
            actor="System",
            module_name="ProvenanceGraphService",
            event_type="GRAPH_CONSTRUCTED",
            event_detail={
                "nodes_count": len(nodes),
                "edges_count": len(edges)
            },
            evidence_id=evidence_id
        )

        return {"nodes": nodes, "edges": edges}
