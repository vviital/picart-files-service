import * as Koa from 'koa';
import * as mongoose from 'mongoose';

import * as logger from 'koa-logger';
import * as cors from '@koa/cors';

import config from './config';
import { chunks, files } from './routes'

const app = new Koa();

app.use(cors());
app.use(logger());

app.use(files.routes());
app.use(chunks.routes())

const main = async () => {
  await mongoose.connect(config.mongoURL, { useNewUrlParser: true });

  app.listen(3000, () => {
    console.log('Koa started');
  });
};

main().catch(console.error);
