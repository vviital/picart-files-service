import { Readable } from 'stream';

import { Chunk } from '../datasources';


async function *streamChunks(hash: string) {
  const firstChunk = await Chunk.findOne({ hash });

  if (!firstChunk) return null;

  yield firstChunk.content;

  for (let i = 1; i < firstChunk.total; i += 1) {
    const chunk = await Chunk.findOne({ hash, index: i });
    
    if (!chunk) {
      throw new Error('Corrupted file');
    }

    yield chunk.content;
  }

  return null;
}

const createFileStream = (hash: string) => Readable.from(streamChunks(hash));

export default createFileStream;
