import mongoose, { Schema, Document } from 'mongoose';

export interface ITimelineEntry {
  timestamp: string | Date;
  author: string;
  action: string;
  notes?: string;
}

export interface IIncident extends Document {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED';
  analyst_id?: mongoose.Types.ObjectId;
  affected_asset_id?: mongoose.Types.ObjectId;
  related_threat_id?: mongoose.Types.ObjectId;
  detection_source?: string;
  resolution_notes?: string;
  timeline: ITimelineEntry[];
  created_at: Date;
  updated_at: Date;
}

const TimelineSchema = new Schema<ITimelineEntry>(
  {
    timestamp: { type: Schema.Types.Mixed, default: () => new Date().toISOString() },
    author: { type: String, required: true },
    action: { type: String, required: true },
    notes: { type: String }
  },
  { _id: false }
);

const IncidentSchema = new Schema<IIncident>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    status: { type: String, enum: ['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'], default: 'OPEN', index: true },
    analyst_id: { type: Schema.Types.ObjectId, ref: 'User' },
    affected_asset_id: { type: Schema.Types.ObjectId, ref: 'Asset' },
    related_threat_id: { type: Schema.Types.ObjectId, ref: 'Threat' },
    detection_source: { type: String },
    resolution_notes: { type: String },
    timeline: { type: [TimelineSchema], default: [] }
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

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
