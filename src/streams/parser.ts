import * as through2 from 'through2';

const parser = (fileID: string) => {
  let totalCount: number = 0;

  const stream = through2.obj(function (chunk, _, callback) {
    const [x, y] =  chunk.toString().split(' ');
    totalCount++;
    this.push({
      fileID,
      y: parseFloat(y.replace(',', '.')),
      x: parseFloat(x.replace(',', '.')),
    });
    callback();
  });

  return ({ 
    stream,
    get totalCount(): number {
      return totalCount;
    },
  });
}

export default parser;
