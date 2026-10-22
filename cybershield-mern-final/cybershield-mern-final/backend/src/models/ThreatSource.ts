import mongoose, { Schema, Document } from 'mongoose';

export interface IThreatSource extends Document {
  id: string;
  name: string;
  type: 'Internal' | 'External Feed' | 'Security Tool' | 'Manual' | 'API';
  description?: string;
  reliability_score: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  indicator_count: number;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

const ThreatSourceSchema = new Schema<IThreatSource>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Internal', 'External Feed', 'Security Tool', 'Manual', 'API'],
      required: true
    },
    description: { type: String },
    reliability_score: { type: Number, default: 80, min: 0, max: 100 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ERROR'], default: 'ACTIVE' },
    indicator_count: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now }
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

export const ThreatSource = mongoose.model<IThreatSource>('ThreatSource', ThreatSourceSchema);
