import * as mongoose from 'mongoose';

const spectrumPointDefinition = new mongoose.Schema({
  __v: {
    type: Number,
    select: false,
  },
  waveLength: {
    type: Number,
    required: true,
  },
  intensity: {
    required: true,
    type: Number,
  },
  fileID: {
    required: true,
    select: false,
    type: String,
  },
});

export interface ISpectrumPoint extends mongoose.Document {
  waveLength: number,
  intensity: number,
  fileID: string,
}

const SpectrumPoint = mongoose.model<ISpectrumPoint>('spectrumPoints', spectrumPointDefinition);

export default SpectrumPoint;
