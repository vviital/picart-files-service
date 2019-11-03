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
  updatedAt: {
    type: Date,
    default: Date.now(),
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

export interface IChunk extends mongoose.Document {
  content: Buffer,
  createdAt: Date,
  hash: string,
  index: number,
  size: number,
  total: number,
  updatedAt: Date,
}

const Chunk = mongoose.model<IChunk>('chunks', chunkDefinition);

export default Chunk;
