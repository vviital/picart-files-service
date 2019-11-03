import * as split from 'split2';

import {
  batcher,
  createFileStream,
  parser,
  uploader,
} from '../streams';
import { SpectrumPoint } from '../datasources';

const chunksToPoints = async (fileID: string, hash: string): Promise<{ totalCount: number }> => { 
  const readable = createFileStream(hash);
  const desc = parser(fileID);

  await new Promise((resolve, reject) => {
    readable
    .on('error', reject)
    .pipe(split('\n'))
    .on('error', reject)
    .pipe(desc.stream)
    .on('error', reject)
    .pipe(batcher())
    .on('error', reject)
    .pipe(uploader(SpectrumPoint))
    .on('error', reject)
    .on('finish', resolve);
  });

  return { totalCount: desc.totalCount };
};

export default chunksToPoints;
