import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILead } from './Lead';
import { IUser } from './User';

export interface IActivity extends Document {
  leadId: mongoose.Types.ObjectId | ILead;
  actorId: mongoose.Types.ObjectId | IUser;
  action: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
export default Activity;
