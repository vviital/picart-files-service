import * as Router from 'koa-router';
import * as Koa from 'koa';
import * as mongoose from 'mongoose';
import { omit } from 'lodash';

import { File, SpectrumPoint } from '../datasources';
import { IFile } from '../datasources/files'
import { ISpectrumPoint } from '../datasources/spectrumLine'
import { contentTypes } from '../constants';
import { auth } from '../middlewares';
import { sendResponse, sendError } from '../senders';
import { Pagination } from '../models';

const router = new Router({
  prefix: '/files',
});

const typeToCollection: {
  [type: string]: mongoose.Model<mongoose.Document, {}>
} = {
  [contentTypes.spectrum]: SpectrumPoint,
}

router.get('/', auth, async (ctx: Koa.Context) => {
  const params = getPaginationParams(ctx);
  const ownerID = ctx.user.id;

  const [count, files] = await Promise.all([
    File.count({ ownerID }),
    File.find({ ownerID })
      .limit(params.limit)
      .skip(params.offset)
      .sort({ updatedAt: -1 })
  ]);

  sendResponse(ctx, 200, {
    ...params,
    items: files.map(x => x.toJSON({ virtuals: true })),
    totalCount: count,
    type: 'collection',
  });
});

router.get('/:id', auth, async (ctx: Koa.Context) => {
  const params = getPaginationParams(ctx);
  const id: string = ctx.params.id;
  const ownerID = ctx.user.id;

  const results = await Promise.all([
    File.findOne({ ownerID, id }),
    SpectrumPoint.find({ fileID: id })
      .limit(params.limit)
      .skip(params.offset)
      .sort({ waveLength: 1 }),
  ]);

  const file: IFile | null = results[0];
  const content: ISpectrumPoint[] = results[1];

  if (!file) {
    return sendError(ctx, 404, { message: 'File not found' });
  }

  sendResponse(ctx, 200, {
    ...file.toJSON({ virtuals: true }),
    content: content.map(x => omit(x.toJSON(), '_id')),
  });
});

router.delete('/:id', auth, async (ctx: Koa.Context) => {
  const id: string = ctx.params.id;
  const ownerID = ctx.user.id;
  const query = { id, ownerID };

  const file = await File.findOne(query);

  if (!file) {
    return sendError(ctx, 404, { message: 'File not found' });
  }

  await File.deleteOne(query);

  const contentType = file.contentType;

  const collection = typeToCollection[contentType];

  if (collection) {
    await collection.deleteMany({ fileID: file.id });
  } else {
    console.error('Unknown content type', contentType);
  }

  sendResponse(ctx, 204);
});

const getPaginationParams = (ctx: Koa.Context): Pagination => {
  return {
    limit: +ctx.request.query.limit || 25,
    offset: +ctx.request.query.offset || 0,
  };
};

export default router;
