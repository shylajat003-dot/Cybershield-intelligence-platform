import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  id: string;
  user_id?: mongoose.Types.ObjectId;
  user_email: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    user_email: { type: String, default: 'system' },
    user_role: { type: String, default: 'SYSTEM' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entity_id: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    ip_address: { type: String, default: '127.0.0.1' }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
