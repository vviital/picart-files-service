const config = {
  mongoURL: process.env.MONGODB_URL || '',
  tokenSecret: process.env.TOKEN_SECRET || '',
};

export default config;
