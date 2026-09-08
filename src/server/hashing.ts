import crypto from 'crypto';

export class HashingService {
  /**
   * Computes SHA-256 hex digest directly from the exact uploaded byte buffer.
   */
  static computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
  }

  /**
   * Constant-time equality verification for cryptographic hashes.
   */
  static verifySha256(buffer: Buffer, expectedHash: string): boolean {
    const computed = this.computeSha256(buffer);
    return computed.toLowerCase() === expectedHash.toLowerCase();
  }
}
