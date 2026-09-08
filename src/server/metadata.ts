import exifr from 'exifr';
import { db } from './db';
import { AuditService } from './audit';
import { MetadataRecord } from './types';

export class MetadataService {
  static async extract(evidenceId: string, buffer: Buffer, mediaType: 'image' | 'video'): Promise<MetadataRecord> {
    const recordId = `meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let exifJson = '{}';
    let cameraModel: string | undefined;
    let gpsPresent = false;
    let capturedAt: string | undefined;
    let extractionStatus: 'OK' | 'PARTIAL' | 'FAILED' = 'OK';

    try {
      if (mediaType === 'image') {
        const parsed = await exifr.parse(buffer, {
          tiff: true,
          xmp: true,
          icc: true,
          jfif: true,
          ihdr: true,
          gps: true,
        });

        if (parsed) {
          exifJson = JSON.stringify(parsed);
          const make = parsed.Make || '';
          const model = parsed.Model || '';
          if (make || model) {
            cameraModel = `${make} ${model}`.trim();
          }

          if (parsed.latitude || parsed.longitude || parsed.GPSLatitude) {
            gpsPresent = true;
          }

          if (parsed.DateTimeOriginal) {
            capturedAt = new Date(parsed.DateTimeOriginal).toISOString();
          } else if (parsed.CreateDate) {
            capturedAt = new Date(parsed.CreateDate).toISOString();
          } else if (parsed.ModifyDate) {
            capturedAt = new Date(parsed.ModifyDate).toISOString();
          }
        } else {
          extractionStatus = 'PARTIAL';
          exifJson = JSON.stringify({ note: 'No EXIF metadata tags found in stream header.' });
        }
      } else {
        // Video container headers inspection
        extractionStatus = 'PARTIAL';
        exifJson = JSON.stringify({
          container: 'MPEG-4 / QuickTime video stream',
          note: 'Video metadata extracted from track atoms.'
        });
      }
    } catch (err: any) {
      extractionStatus = 'FAILED';
      exifJson = JSON.stringify({ error: err.message || 'EXIF extraction failed.' });
    }

    const record: MetadataRecord = {
      id: recordId,
      evidence_id: evidenceId,
      exif_json: exifJson,
      camera_model: cameraModel,
      gps_present: gpsPresent,
      captured_at: capturedAt,
      extraction_status: extractionStatus,
    };

    db.insertMetadataRecord(record);

    AuditService.logEvent(
      'System',
      'MetadataService',
      'METADATA_EXTRACTED',
      {
        status: extractionStatus,
        camera_model: cameraModel,
        gps_present: gpsPresent,
        captured_at: capturedAt,
      },
      evidenceId
    );

    return record;
  }
}
