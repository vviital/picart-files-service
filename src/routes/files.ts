import * as Router from 'koa-router';
import * as Koa from 'koa';

import { File, SpectrumPoint } from '../datasources';
import { IFile } from '../datasources/file'
import { ISpectrumPoint } from '../datasources/spectrumLine'
import { contentTypes } from '../constants';
import * as mongoose from 'mongoose';
import { omit } from 'lodash';

const router = new Router({
  prefix: '/files',
});

type Pagination = {
  limit: number,
  offset: number,
}

const typeToCollection: {
  [type: string]: mongoose.Model<mongoose.Document, {}>
} = {
  [contentTypes.spectrum]: SpectrumPoint,
}

const getPaginationParams = (ctx: Koa.Context): Pagination => {
  return {
    limit: +ctx.request.query.limit || 25,
    offset: +ctx.request.query.offset || 0,
  };
};

router.get('/', async (ctx: Koa.Context) => {
  const params = getPaginationParams(ctx);
  const ownerID = 'unknown';

  const [count, files] = await Promise.all([
    File.count({ ownerID }),
    File.find({ ownerID })
      .limit(params.limit)
      .skip(params.offset)
      .sort({ createdAt: -1 })
  ]);

  ctx.body = {
    ...params,
    items: files.map(x => x.toJSON({ virtuals: true })),
    totalCount: count,
    type: 'collection',
  };
});

router.get('/:id', async (ctx: Koa.Context) => {
  const params = getPaginationParams(ctx);
  const id: string = ctx.params.id;
  const ownerID = 'unknown';

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
    ctx.status = 404;
    ctx.body = { message: 'File not found' };
    return;
  }

  ctx.body = {
    ...file.toJSON({ virtuals: true }),
    content: content.map(x => omit(x.toJSON(), '_id')),
  };
});

router.delete('/:id', async (ctx: Koa.Context) => {
  const id: string = ctx.params.id;
  const ownerID = 'unknown';
  const query = { id, ownerID };

  const file = await File.findOne(query);

  if (!file) {
    ctx.status = 404;
    ctx.body = { message: 'File not found' };
    return
  }

  await File.deleteOne(query);

  const contentType = file.contentType;

  const collection = typeToCollection[contentType];

  if (collection) {
    await collection.deleteMany({ fileID: file.id });
  } else {
    console.error('Unknown content type', contentType);
  }

  ctx.status = 204;
});

export default router;
