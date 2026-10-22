import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

export class AuditService {
  public static async logAction(params: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      let validUserId: mongoose.Types.ObjectId | undefined;
      if (params.userId && mongoose.Types.ObjectId.isValid(params.userId)) {
        validUserId = new mongoose.Types.ObjectId(params.userId);
      }

      await AuditLog.create({
        user_id: validUserId,
        user_email: params.userEmail || 'system',
        user_role: params.userRole || 'SYSTEM',
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        details: params.details || {},
        ip_address: params.ipAddress || '127.0.0.1'
      });
    } catch (err) {
      console.error('Failed to log audit event:', err);
    }
  }
}
