import fs from 'fs';
import path from 'path';
import { HashingService } from './hashing';

const STORAGE_ROOT = path.resolve(process.cwd(), 'data', 'storage');
export const ORIGINAL_DIR = path.join(STORAGE_ROOT, 'original');
export const ARTIFACTS_DIR = path.join(STORAGE_ROOT, 'artifacts');
export const REPORTS_DIR = path.join(STORAGE_ROOT, 'reports');

export class StorageService {
  static initialize(): void {
    if (!fs.existsSync(ORIGINAL_DIR)) fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
    if (!fs.existsSync(ARTIFACTS_DIR)) fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  /**
   * Application-level write-once guarantee for original evidence.
   * Overwrite is strictly prohibited.
   */
  static writeOnceOriginal(
    evidenceId: string,
    buffer: Buffer,
    expectedSha256: string,
    extension: string
  ): string {
    this.initialize();
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    const filename = `${evidenceId}_${expectedSha256.substring(0, 16)}${ext}`;
    const targetPath = path.join(ORIGINAL_DIR, filename);

    if (fs.existsSync(targetPath)) {
      throw new Error(`Evidence ${evidenceId} already exists in storage. Overwrite forbidden.`);
    }

    fs.writeFileSync(targetPath, buffer);

    // Verify stored bytes integrity
    const reReadBuffer = fs.readFileSync(targetPath);
    const reComputedHash = HashingService.computeSha256(reReadBuffer);

    if (reComputedHash !== expectedSha256.toLowerCase()) {
      try {
        fs.unlinkSync(targetPath);
      } catch {}
      throw new Error('Integrity verification failed: stored bytes SHA-256 mismatch.');
    }

    return targetPath;
  }

  static storeDerivedArtifact(artifactId: string, buffer: Buffer, extension: string): string {
    this.initialize();
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    const targetPath = path.join(ARTIFACTS_DIR, `${artifactId}${ext}`);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  static storeReport(reportId: string, buffer: Buffer): string {
    this.initialize();
    const targetPath = path.join(REPORTS_DIR, `BSA_Section63_Report_${reportId}.pdf`);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  static readArtifact(storageRef: string): Buffer {
    if (!fs.existsSync(storageRef)) {
      throw new Error(`Artifact file not found at ${storageRef}`);
    }
    return fs.readFileSync(storageRef);
  }
}
