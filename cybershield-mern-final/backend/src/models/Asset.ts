import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset extends Document {
  id: string;
  name: string;
  ip_address: string;
  hostname?: string;
  asset_type: 'Server' | 'Workstation' | 'Laptop' | 'Database' | 'Network Device' | 'Cloud Resource' | 'Application';
  environment: string;
  owner?: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN';
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true },
    ip_address: { type: String, required: true, index: true },
    hostname: { type: String },
    asset_type: {
      type: String,
      enum: ['Server', 'Workstation', 'Laptop', 'Database', 'Network Device', 'Cloud Resource', 'Application'],
      required: true
    },
    environment: { type: String, default: 'Production' },
    owner: { type: String },
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'DEGRADED', 'UNKNOWN'], default: 'ONLINE' },
    criticality: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    last_seen: { type: Date, default: Date.now }
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

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
