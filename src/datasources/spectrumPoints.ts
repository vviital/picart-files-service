import * as mongoose from 'mongoose';

const spectrumPointDefinition = new mongoose.Schema({
  __v: {
    type: Number,
    select: false,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    required: true,
    type: Number,
  },
  fileID: {
    required: true,
    select: false,
    type: String,
  },
});

spectrumPointDefinition.index({ fileID: 1, x: 1 });

export interface ISpectrumPoint extends mongoose.Document {
  fileID: string,
  y: number,
  x: number,
}

const SpectrumPoint = mongoose.model<ISpectrumPoint>('spectrumPoints', spectrumPointDefinition);

export default SpectrumPoint;
