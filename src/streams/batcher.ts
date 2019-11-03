import * as through2 from 'through2';

export type BatcherOptions = {
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

export default batcher;
