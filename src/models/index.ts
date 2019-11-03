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

export type UserClaims = {
  id: string,
  email: string,
  login: string,
  roles: string[],
}
