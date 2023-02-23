import path from 'path';

import express from 'express';
import fs from 'fs-extra';

import { docer } from '../Docer';
import { UpdateConfigPayload } from '../type';

export const configRouter = express.Router();

configRouter.get('/getConfigs', (_, res) => {
  return res.send({ configs: docer.configs, err: 0, message: 'success' });
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
configRouter.post('/updateConfigs', async (req, res) => {
  const configs = req.fields as unknown as UpdateConfigPayload;

  if (!fs.existsSync(path.resolve(configs.docRootPath))) return res.send({ err: 1, message: 'root path not exist' });

  try {
    await fs.writeFile(path.resolve(__dirname, '../../', 'config.json'), JSON.stringify(configs));

    // update docer
    docer.updateConfigs(configs);

    return res.send({ err: 0, message: 'updated' });
  } catch (err) {
    return res.send({ err: 1, message: String(err) });
  }
});
