import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IDocument extends MongooseDocument {
  title: string;
  content: any; // Schema.Types.Mixed for Tiptap JSON
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    content: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ ownerId: 1, updatedAt: -1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
