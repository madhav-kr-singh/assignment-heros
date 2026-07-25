import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILead } from './Lead';
import { IUser } from './User';

export interface INote extends Document {
  leadId: mongoose.Types.ObjectId | ILead;
  authorId: mongoose.Types.ObjectId | IUser;
  text: string;
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export default Note;
