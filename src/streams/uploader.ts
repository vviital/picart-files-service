import * as mongoose from 'mongoose';
import { Writable } from 'stream';

const uploader = (Model: mongoose.Model<mongoose.Document, {}>): Writable => {
  const upload = async (chunks: object[], callback: Function) => {
    await Model.insertMany(chunks);
    callback();
  };

  return new Writable({
    objectMode: true,
    write(chunks: object[], _: string, callback: Function) {
      upload(chunks, callback);
    }
  })
};

export default uploader;
