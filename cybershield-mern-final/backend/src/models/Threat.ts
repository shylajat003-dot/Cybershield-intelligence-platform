import mongoose, { Schema, Document } from 'mongoose';

export interface IThreat extends Document {
  id: string;
  indicator: string;
  indicator_type: 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'EMAIL' | 'FILE' | 'CERTIFICATE';
  category: 'Malware' | 'Phishing' | 'Botnet' | 'Ransomware' | 'Credential Theft' | 'Command & Control' | 'Data Exfiltration' | 'Brute Force' | 'Suspicious Activity' | 'Other';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  risk_score: number;
  source_id?: mongoose.Types.ObjectId;
  source_name?: string;
  description?: string;
  first_seen: Date;
  last_seen: Date;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  tags: string[];
  mitre_tactic?: string;
  mitre_technique?: string;
  recurrence_count: number;
  created_at: Date;
  updated_at: Date;
}

const ThreatSchema = new Schema<IThreat>(
  {
    indicator: { type: String, required: true, index: true },
    indicator_type: {
      type: String,
      enum: ['IP', 'DOMAIN', 'URL', 'HASH', 'EMAIL', 'FILE', 'CERTIFICATE'],
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: [
        'Malware', 'Phishing', 'Botnet', 'Ransomware', 'Credential Theft',
        'Command & Control', 'Data Exfiltration', 'Brute Force', 'Suspicious Activity', 'Other'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true
    },
    confidence: { type: Number, default: 75, min: 0, max: 100 },
    risk_score: { type: Number, default: 50, min: 0, max: 100 },
    source_id: { type: Schema.Types.ObjectId, ref: 'ThreatSource' },
    description: { type: String },
    first_seen: { type: Date, default: Date.now },
    last_seen: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'],
      default: 'ACTIVE',
      index: true
    },
    tags: { type: [String], default: [] },
    mitre_tactic: { type: String },
    mitre_technique: { type: String },
    recurrence_count: { type: Number, default: 1 }
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

export const Threat = mongoose.model<IThreat>('Threat', ThreatSchema);
