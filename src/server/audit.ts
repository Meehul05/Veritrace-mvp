import { randomUUID } from 'crypto';
import { db } from './db';
import { AuditEvent } from './types';

export class AuditService {
  /**
   * Appends an audit event to the tamper-evident ledger.
   * Never throws to avoid blocking pipeline, but records full context.
   */
  static logEvent(
    actor: string,
    moduleName: string,
    eventType: string,
    eventDetail: Record<string, any>,
    evidenceId?: string,
    investigationId?: string
  ): string {
    const id = `audit_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const event: AuditEvent = {
      id,
      evidence_id: evidenceId,
      investigation_id: investigationId,
      actor,
      module_name: moduleName,
      event_type: eventType,
      event_detail: eventDetail,
      timestamp: new Date().toISOString(),
    };

    try {
      db.insertAuditEvent(event);
    } catch (err) {
      console.error('[AUDIT_ERROR] Failed to record audit event:', err);
    }

    return id;
  }

  static getAuditTrail(evidenceId?: string): AuditEvent[] {
    return db.getAuditEvents(evidenceId);
  }
}
