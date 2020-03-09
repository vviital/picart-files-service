import * as mongoose from 'mongoose';

const chunkDefinition = new mongoose.Schema({
  __v: {
    type: Number,
    select: false,
  },
  index: {
    type: Number,
  },
  total: {
    type: Number,
  },
  hash: {
    type: String,
  },
  size: {
    type: Number,
  },
  content: {
    type: Buffer,
  },
  ownerID: {
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
});

chunkDefinition.index({ ownerID: 1, hash: 1, index: 1 });

export interface IChunk extends mongoose.Document {
  content: Buffer,
  createdAt: Date,
  hash: string,
  index: number,
  ownerID: string,
  size: number,
  total: number,
  updatedAt: Date,
}

const Chunk = mongoose.model<IChunk>('chunks', chunkDefinition);

export default Chunk;
