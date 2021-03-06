import { Context } from 'koa'
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import { get }  from 'lodash';
import * as shortID from 'shortid';

import { ChunkUploadBody } from '../models';
import { Chunk, File, fsStorage } from '../datasources';
import { contentTypes } from '../constants';
import { auth } from '../middlewares';
import { sendResponse, sendError } from '../senders';
import chunksToPoints from '../parser';

const router = new Router({
  prefix: '/chunks',
});

router.post('/', auth, koaBody({
  // Add limits to the max size;
  multipart: true,
}), async (ctx: Context) => {
  const file: any = get(ctx, 'request.files.chunk');
  const body = extractChunkMeta(get(ctx, 'request.body'));
  const ownerID: string = ctx.user.id;
  const content = await fsStorage.getChunkContent(file.path);

  const chunk = new Chunk({ ...body, content, ownerID });
  await chunk.save();

  sendResponse(ctx, 200, { id: chunk.id });
});

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

  const result = await chunksToPoints(fileID, hash);

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

const extractChunkMeta = (body: any): ChunkUploadBody => {
  return {
    filename: get(body, 'filename', ''),
    hash: get(body, 'hash', ''),
    index: get(body, 'index', 0),
    size: get(body, 'size', 0),
    total: get(body, 'total', 0),
  };
};

const extractFileMeta = (body: any) => ({
  title: get(body, 'title', ''),
  description: get(body, 'description', ''),
  resourceID: get(body, 'resourceID', ''),
});

export default router;
