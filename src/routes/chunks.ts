import { Context } from 'koa'
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import { get, chunk as splitToChunks }  from 'lodash';
import * as fs from 'fs';
import * as util from 'util';
import { Readable, Writable } from 'stream';
import * as split from 'split2';
import * as through2 from 'through2';
import * as shortID from 'shortid';
import * as mongoose from 'mongoose';

import { ChunkUploadBody } from '../models/chunk';
import { Chunk, File, SpectrumPoint } from '../datasources';
import { contentTypes } from '../constants';

const readFile = util.promisify(fs.readFile);
const deleteFile = util.promisify(fs.unlink);

const router = new Router({
  prefix: '/chunks',
});

const extractChunkParams = (body: any): ChunkUploadBody => {
  return {
    filename: get(body, 'filename', ''),
    hash: get(body, 'hash', ''),
    index: get(body, 'index', 0),
    size: get(body, 'size', 0),
    total: get(body, 'total', 0),
  };
};

const getChunkContent = async (path: string): Promise<Buffer> => {
  const buffer: Buffer = await readFile(path);

  // We need to delete uploaded file.
  await deleteFile(path);

  return buffer;
}

router.post('/', koaBody({
  // Add limits to the max size;
  multipart: true,
}), async (ctx: Context) => {
  const file: any = get(ctx, 'request.files.chunk');
  const body = extractChunkParams(get(ctx, 'request.body'));
  const content = await getChunkContent(file.path);
  const ownerID = 'unknown';

  const chunk = new Chunk({ ...body, content, ownerID });
  await chunk.save();

  ctx.status = 200;
  ctx.body = { id: chunk.id };
});

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

type BatcherOptions = {
  size?: number,
};

const batcher = (options: BatcherOptions = {}) => {
  const size = options.size || 100;
  let buffer: any = [];

  function transform(chunk: any, _: any, callback: through2.TransformCallback) {
    buffer.push(chunk);

    if (buffer.length === size) {
      this.push(buffer);
      buffer = [];
    }

    callback();
  }

  function flush(callback: through2.TransformCallback) {
    if (buffer.length) {
      this.push(buffer);
    }

    callback();
  }

  return through2.obj(transform, flush);
};

const uploader = (Model: mongoose.Model<mongoose.Document, {}>): Writable => {
  const upload = async (chunks: object[], callback: Function) => {
    await Model.insertMany(chunks);
    callback(null);
  };

  return new Writable({
    objectMode: true,
    write(chunks: object[], _: string, callback: Function) {
      upload(chunks, callback);
    }
  })
};

const uploadPoints = async (fileID: string, hash: string): Promise<{ totalCount: number }> => { 
  const readable = Readable.from(streamChunks(hash));
  let totalCount = 0;

  const result = await new Promise((resolve, reject) => {
    readable
    .on('error', reject)
    .pipe(split('\n'))
    .on('error', reject)
    .pipe(through2.obj(function (chunk, _, callback) {
      const [waveLength, intensity] =  chunk.toString().split(' ');
      totalCount++;
      this.push({
        fileID,
        intensity: parseFloat(intensity.replace(',', '.')),
        waveLength: parseFloat(waveLength.replace(',', '.')),
      });
      callback();
    }))
    .on('error', reject)
    .pipe(batcher())
    .on('error', reject)
    .pipe(uploader(SpectrumPoint))
    .on('error', reject)
    .on('finish', () => resolve({ totalCount }));
  });

  return result as Promise<{ totalCount: number }>;
}

router.delete('/:hash', async (ctx: Context) => {
  const hash: string = get(ctx, 'params.hash', '');
  const ownerID: string = 'unknown';
  const query = { ownerID, hash }

  const result = await Chunk.deleteMany(query);

  if (!result.deletedCount) {
    ctx.body = { message: 'Chunks not found' };
    ctx.status = 404;
    return
  }

  ctx.status = 204;
});

// Create file with analyzed spectrum points.
router.post('/spectrum/:hash', koaBody(), async (ctx: Context) => {
  const hash: string = get(ctx, 'params.hash', '');
  const body = get(ctx, 'request.body', {});
  const fileID = shortID();
  const ownerID = 'unknown';

  const count = await Chunk.count({ hash, ownerID })

  if (!count) {
    ctx.body = { message: 'Chunks not found' };
    ctx.status = 404;
    return;
  }

  const result = await uploadPoints(fileID, hash);

  const file = new File({
    ...body,
    contentType: contentTypes.spectrum,
    id: fileID,
    ownerID: 'unknown', // hard-coded value for tests.
    totalCount: result.totalCount,
  });
  await file.save();

  ctx.status = 201;
  ctx.body = file.toJSON({ virtuals: true });
});

export default router;
