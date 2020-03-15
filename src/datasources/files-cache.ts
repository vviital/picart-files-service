import * as mongoose from 'mongoose';
import * as hash from 'object-hash';

import {definition as fileDefinition, IFile} from './files';
import {ISpectrumPoint} from './spectrumPoints';

const cachedFile = new mongoose.Schema({
  value: {
    type: String
  },
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    select: false,
  }
});

cachedFile.statics.findByCacheKey = async function findByCacheKey(key: string): Promise<IFileCache | undefined> {
  const cache = await this.findOne({ cacheKey: key });
  if (!cache) {
    return cache;
  }
  return JSON.parse(cache.value);
};

cachedFile.statics.createCacheKey = function createCacheKey(params: object): string {
  return hash(params);
}

cachedFile.statics.persist = async function (key: string, obj: object = {}) {
  const value = JSON.stringify(obj);
  const cache = new this({ cacheKey: key, value })
  return await cache.save();
}
 
cachedFile.virtual('type').get(() => 'file');
cachedFile.index({ cacheKey: 'hashed' });

export interface IFileCache extends IFile {
  content: ISpectrumPoint[]
}

export type FileCacheSchema = mongoose.Model<IFileCache> & {
  findByCacheKey: (key: string) => Promise<IFileCache | undefined>
  persist: (key: string, obj: object) => IFileCache
  createCacheKey: (params: object) => string
};

const CachedFile = mongoose.model<IFileCache, FileCacheSchema>('cachedFiles', cachedFile);

export default CachedFile;
