import * as got from 'got';
import * as FormData from 'form-data';
import * as fs from 'fs';

import createApp from '../src/app'
import config from '../src/config';

const getURL = () => `http://localhost:${config.port}`;
// use hard-coded token in the tests.
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJsb2dpbiI6InRlc3QtbG9naW4iLCJyb2xlcyI6WyJ1c2VyIiwiYWRtaW4iXSwiaWF0IjoxNTcyNzc1NjQ3LCJleHAiOjQ3MjYzNzU2NDd9.qCE8lh3L5t7OubH8tAVVTEW7ANwjwn2BfiwUnaBu7dM';
const defaultHeaders = {
  Authorization: `Bearer ${token}`,
};

describe('File service common flow', () => {
  let app: { destroy: () => Promise<void> };
  const hash = Math.random().toString(16).slice(2);
  let fileID: string;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.destroy();
  });

  it('should upload chunks', async () => {
    const url = `${getURL()}/chunks`;

    const sendChunk = async (chunk: string, options: { [key: string]: any }) => {
      const form = new FormData();

      Object.keys(options).forEach((key) => {
        form.append(key, options[key]);
      });

      form.append('chunk', fs.createReadStream(__dirname + `/files/${chunk}.txt`));

      const { body } = await got.post(url, {
        body: form,
        headers: defaultHeaders,
      });

      const r = JSON.parse(body);

      expect(r).toEqual({
        id: expect.any(String),
      });
    };

    const common = {
      filename: 'test.txt',
      hash,
      size: 100,
      total: 2,
    };

    await sendChunk('chunk1', { ...common, index: 0 });
    await sendChunk('chunk2', { ...common, index: 1 });
  });

  it('should combine chunks to the spectrum file', async () => {
    const url = `${getURL()}/chunks/spectrum/${hash}`;

    const { body } = await got.post(url, {
      json: true,
      headers: defaultHeaders,
      body: {
        title: 'Test title',
        description: 'Test description',
        resourceID: 'Test search',
      },
    });

    expect(body).toEqual(expect.objectContaining({
      contentType: 'spectrum',
      createdAt: expect.any(String),
      description: 'Test description',
      id: expect.any(String),
      ownerID: 'test',
      resourceID: 'Test search',
      title: 'Test title',
      totalCount: 3,
      type: 'file',
      updatedAt: expect.any(String),
    }));

    fileID = body.id;
  });

  it('should delete chunks', async () => {
    let url = `${getURL()}/chunks/${hash}`;

    let result = await got.delete(url, {
      headers: defaultHeaders,
    });

    expect(result.statusCode).toEqual(204);

    url = `${getURL()}/chunks/spectrum/${hash}`;

    result = await got.post(url, {
      json: true,
      headers: defaultHeaders,
      body: {
        title: 'Test title',
        description: 'Test description',
        resourceID: 'Test search',
      },
      throwHttpErrors: false,
    });

    expect(result).toEqual(expect.objectContaining({
      statusCode: 404,
      body: {
        message: 'Chunks not found',
      },
    }));
  });

  it('should get all files', async () => {
    const url = `${getURL()}/files`;

    const { body } = await got(url, {
      headers: defaultHeaders,
      json: true,
    });

    expect(body).toEqual(expect.objectContaining({
      limit: 25,
      offset: 0,
      items: [
        {
          resourceID: 'Test search',
          updatedAt: expect.any(String),
          createdAt: expect.any(String),
          _id: expect.any(String),
          title: 'Test title',
          description: 'Test description',
          contentType: 'spectrum',
          id: expect.any(String),
          ownerID: 'test',
          totalCount: 3,
          type: 'file'
        }
      ],
      totalCount: 1,
      type: 'collection'
    }));
  });

  it('should get file by ID', async () => {
    const url = `${getURL()}/files/${fileID}`;

    const { body } = await got(url, {
      headers: defaultHeaders,
      json: true,
    });

    expect(body).toEqual(expect.objectContaining({
      resourceID: 'Test search',
      updatedAt: expect.any(String),
      createdAt: expect.any(String),
      title: 'Test title',
      description: 'Test description',
      contentType: 'spectrum',
      id: expect.any(String),
      ownerID: 'test',
      totalCount: 3,
      type: 'file',
      content: [
        { y: 2, x: 1 },
        { y: 4, x: 3 },
        { y: 6, x: 5 }
      ],
    }));
  });

  it('should delete file by ID', async () => {
    const url = `${getURL()}/files/${fileID}`;

    let result = await got.delete(url, {
      headers: defaultHeaders,
    });

    expect(result.statusCode).toEqual(204);

    result = await got(url, {
      headers: defaultHeaders,
      json: true,
      throwHttpErrors: false,
    });

    expect(result).toEqual(expect.objectContaining({
      statusCode: 404,
      body: {
        message: 'File not found',
      },
    }));
  });
});
