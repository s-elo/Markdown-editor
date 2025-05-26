import express from 'express';
import formidableMiddleware from 'express-formidable';
import fs from 'fs-extra';
import open from 'open';

import { docer } from './Docer';
import {
  configRouter,
  docsModifyRouter,
  docsQueryRouter,
  gitOperationRouter,
  imgStoreRouter,
  menuModifyRouter,
} from './routers';
import { projectRoot } from './utils';

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const mode = process.argv.slice(2)[0];

const server = express();

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const port = mode === 'production' ? 3022 : 3024;

server.use('/', express.static(projectRoot('client/build')));

// Cross-Origin Resource Sharing
server.all('*', (req, res, next) => {
  // for complicated request
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization,Accept,Content-Type,Referer,sec-ch-ua,sec-ch-ua-mobile,User-Agent',
  );
  res.header('Access-Control-Allow-Origin', `*`);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT, PATCH');

  next();
});

// handle formData and post method
server.use(formidableMiddleware());

const initGitPull = async (): Promise<void> => {
  console.log('git initially pulling...');

  try {
    await docer.git?.pull();
    console.log(' doc is updated!');
  } catch (e) {
    console.log(`failed to pull doc: ${(e as Error).message}`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
const app = server.listen(port, async (): Promise<void> => {
  docer.start();

  // only for production mode
  if (mode === 'production') {
    await initGitPull();
    void open(`http://localhost:${port}`);
  }

  console.log(`Listening on port ${port}`);
});

app.on('error', () => {
  // already listened
  void open(`http://localhost:${port}`);
});

server.use('/api/getDocs', docsQueryRouter);
server.use('/api/editDoc', docsModifyRouter);
server.use('/api/menu', menuModifyRouter);
server.use('/api/git', gitOperationRouter);
server.use('/api/imgStore', imgStoreRouter);
server.use('/api/config', configRouter);

// when no matched, including '/', just return the index.html
server.get('*', (_, res) => {
  const frontPage = fs.readFileSync(projectRoot('client/build/index.html'), 'utf-8');
  return res.send(frontPage);
});
