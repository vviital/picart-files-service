import * as fs from 'fs';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
const deleteFile = util.promisify(fs.unlink);

const getChunkContent = async (path: string): Promise<Buffer> => {
  const buffer: Buffer = await readFile(path);

  // We need to delete uploaded file.
  await deleteFile(path);

  return buffer;
}

export default {
  getChunkContent,
};
