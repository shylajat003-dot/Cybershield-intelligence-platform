import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  id: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
  alert_type: string;
  source?: string;
  related_threat_id?: mongoose.Types.ObjectId;
  related_asset_id?: mongoose.Types.ObjectId;
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';
  created_at: Date;
  updated_at: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    title: { type: String, required: true },
    description: { type: String },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'INFO'],
      required: true,
      index: true
    },
    alert_type: { type: String, required: true },
    source: { type: String },
    related_threat_id: { type: Schema.Types.ObjectId, ref: 'Threat' },
    related_asset_id: { type: Schema.Types.ObjectId, ref: 'Asset' },
    status: {
      type: String,
      enum: ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED'],
      default: 'NEW',
      index: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
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

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
