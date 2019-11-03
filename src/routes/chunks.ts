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

import { ChunkUploadBody } from '../models';
import { Chunk, File, SpectrumPoint } from '../datasources';
import { contentTypes } from '../constants';
import { auth } from '../middlewares';
import { sendResponse, sendError } from '../senders';

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

router.post('/', auth, koaBody({
  // Add limits to the max size;
  multipart: true,
}), async (ctx: Context) => {
  const file: any = get(ctx, 'request.files.chunk');
  const body = extractChunkParams(get(ctx, 'request.body'));
  const content = await getChunkContent(file.path);
  const ownerID: string = ctx.user.id;

  const chunk = new Chunk({ ...body, content, ownerID });
  await chunk.save();

  sendResponse(ctx, 200, { id: chunk.id });
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

router.delete('/:hash', auth, async (ctx: Context) => {
  const hash: string = get(ctx, 'params.hash', '');
  const ownerID: string = ctx.user.id;
  const query = { ownerID, hash }

  const result = await Chunk.deleteMany(query);

  if (!result.deletedCount) {
    return sendError(ctx, 404, { message: 'Chunks not found' });
  }

  sendResponse(ctx, 204);
});

const extractFileMeta = (body: any) => ({
  title: get(body, 'title', ''),
  description: get(body, 'description', ''),
  resourceID: get(body, 'resourceID', ''),
});

// Create file with analyzed spectrum points.
router.post('/spectrum/:hash', auth, koaBody(), async (ctx: Context) => {
  const hash: string = get(ctx, 'params.hash', '');
  const body = get(ctx, 'request.body', {});
  const fileID = shortID();
  const ownerID = ctx.user.id;

  const count = await Chunk.count({ hash, ownerID })

  if (!count) {
    return sendError(ctx, 404, { message: 'Chunks not found' });
  }

  const result = await uploadPoints(fileID, hash);

  const file = new File({
    ...extractFileMeta(body),
    contentType: contentTypes.spectrum,
    id: fileID,
    ownerID,
    totalCount: result.totalCount,
  });
  await file.save();

  sendResponse(ctx, 201, file.toJSON({ virtuals: true }));
});

export default router;
