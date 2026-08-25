import mongoose, { Schema, Document } from 'mongoose';

export interface IShare extends Document {
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  permission: 'viewer' | 'editor';
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema: Schema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: ['viewer', 'editor'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ShareSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IShare>('Share', ShareSchema);
