export type ChunkUploadBody = {
  filename: string,
  hash: string,
  index: number,
  size: number,
  total: number,
}

export type ChunkDescriptor = ChunkUploadBody & {
  content: Buffer,
}
