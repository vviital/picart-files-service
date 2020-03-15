import * as mongoose from 'mongoose';

export const definition = {
  __v: {
    type: Number,
    select: false,
  },
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String
  },
  ownerID: {
    type: String,
    required: true,
  },
  resourceID: {
    type: String,
    default: 'unknown',
  },
  totalCount: {
    type: Number,
  },
  hash: {
    type: String,
  },
  contentType: {
    type: String,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
};

const fileDefinition = new mongoose.Schema(definition);

fileDefinition.virtual('type').get(() => 'file');
fileDefinition.index({ ownerID: 1, updatedAt: -1 });
fileDefinition.index({ ownerID: 1, resourceID: 1, updatedAt: -1 });

export interface IFile extends mongoose.Document {
  contentType: string,
  createdAt: Date,
  description: string,
  hash: string,
  id: string,
  ownerID: string,
  resourceID: string,
  title: string,
  totalCount: number,
  type: string,
  updatedAt: Date,
}

const File = mongoose.model<IFile>('files', fileDefinition);

export default File;
