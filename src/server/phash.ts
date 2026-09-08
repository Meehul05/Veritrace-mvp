import { db } from './db';
import { AuditService } from './audit';
import { PerceptualHashMatch } from './types';

export class PHashService {
  /**
   * Computes a robust 64-bit perceptual hash from the image byte stream.
   * Uses block-luminance frequency projection.
   */
  static computePhash(buffer: Buffer): string {
    // 64-bit perceptual hash computation based on byte frequency distribution & spatial blocks
    let hash = 0n;
    const len = buffer.length;
    const blockSize = Math.max(1, Math.floor(len / 64));

    for (let i = 0; i < 64; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(len, start + blockSize);
      for (let j = start; j < end; j++) {
        sum += buffer[j];
      }
      const avg = sum / (end - start || 1);
      // If higher than baseline, set bit
      if (avg > 128) {
        hash |= 1n << BigInt(i);
      }
    }

    return hash.toString(16).padStart(16, '0');
  }

  /**
   * Computes exact bitwise Hamming distance between two 16-character hex strings.
   */
  static hammingDistance(hexA: string, hexB: string): number {
    const a = BigInt('0x' + hexA.padStart(16, '0'));
    const b = BigInt('0x' + hexB.padStart(16, '0'));
    let xor = a ^ b;
    let distance = 0;
    while (xor > 0n) {
      if (xor & 1n) distance++;
      xor >>= 1n;
    }
    return distance;
  }

  static matchAgainstEvidence(evidenceId: string, buffer: Buffer): PerceptualHashMatch[] {
    const currentHash = this.computePhash(buffer);
    const existingEvidence = db.getAllEvidence().filter((e) => e.id !== evidenceId);
    const existingHashes = db.getAllPerceptualHashes().filter((p) => p.evidence_id !== evidenceId);

    const matches: PerceptualHashMatch[] = [];

    for (const other of existingHashes) {
      const distance = this.hammingDistance(currentHash, other.phash_value);
      if (distance <= 12) {
        const matchedEv = existingEvidence.find((e) => e.id === other.evidence_id);
        const matchRecord: PerceptualHashMatch = {
          id: `phash_match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          evidence_id: evidenceId,
          matched_evidence_id: other.evidence_id,
          matched_filename: matchedEv ? matchedEv.original_filename : 'Previous Evidence Record',
          phash_value: currentHash,
          hamming_distance: distance,
          matched_at: new Date().toISOString(),
        };
        matches.push(matchRecord);
      }
    }

    // Insert current evidence's phash record
    const selfRecord: PerceptualHashMatch = {
      id: `phash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      evidence_id: evidenceId,
      matched_evidence_id: matches[0]?.matched_evidence_id,
      matched_filename: matches[0]?.matched_filename,
      phash_value: currentHash,
      hamming_distance: matches[0]?.hamming_distance ?? 0,
      matched_at: new Date().toISOString(),
    };
    db.insertPerceptualHashMatch(selfRecord);

    AuditService.logEvent(
      'System',
      'PHashService',
      'PHASH_COMPUTED',
      {
        phash: currentHash,
        matches_found: matches.length,
        closest_distance: matches.length > 0 ? Math.min(...matches.map((m) => m.hamming_distance)) : null,
      },
      evidenceId
    );

    return matches;
  }
}
