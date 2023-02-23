/* eslint-disable @typescript-eslint/no-misused-promises */
import OSS from 'ali-oss';
import express from 'express';

import { docer } from '../Docer';
import { UploadFileType, UploadParamType, DeleteImgType, RenameType } from '../type';

export const imgStoreRouter = express.Router();
// const imgStoreBaseUrl = `https://sm.ms/api/v2`;

const { region, accessKeyId, accessKeySecret, bucket } = docer.configs;

const client =
  !region || !accessKeyId || !accessKeySecret || !bucket
    ? null
    : new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket,
      });

imgStoreRouter.get('/uploadHistory', async (_, res) => {
  if (!client) return res.send({ err: 1, message: 'no configs' });

  try {
    const result = await client.list(
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'max-keys': 1000,
        // prefix: "img/",
      },
      {},
    );

    return res.send({
      imgList: result.objects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()),
      err: 0,
      message: 'success',
    });
  } catch (err) {
    return res.send({ err: 1, message: err });
  }
});

imgStoreRouter.post('/upload', async (req, res) => {
  const { imgFile } = req.files as UploadFileType;
  const { fileName } = req.fields as UploadParamType;

  if (!client) return res.send({ err: 1, message: 'no configs' });

  try {
    const result = await client.put(`${fileName}`, imgFile.path, {
      timeout: 60000,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      headers: { 'x-oss-forbid-overwrite': true },
    });

    return res.send({ err: 0, message: 'uploaded!', ...result.res });
  } catch (err) {
    return res.send({ err: 1, message: String(err) });
  }
});

imgStoreRouter.delete('/delete', async (req, res) => {
  const { imgName } = req.fields as DeleteImgType;

  if (!client) return res.send({ err: 1, message: 'no configs or connection' });

  try {
    const result = await client.delete(`${imgName}`);

    return res.send({ err: 0, message: 'deleted!', ...result });
  } catch (err) {
    return res.send({ err: 1, message: String(err) });
  }
});

imgStoreRouter.patch('/rename', async (req, res) => {
  const { fileName, newName } = req.fields as RenameType;

  if (!client) return res.send({ err: 1, message: 'no configs' });

  try {
    await client.copy(newName, fileName);

    const deletRet = await client.delete(fileName);

    return res.send({ err: 0, message: 'renamed!', ...deletRet });
  } catch (err) {
    return res.send({ err: 1, message: String(err) });
  }
});
