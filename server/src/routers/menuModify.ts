import express from 'express';

import { docer } from '../Docer';
import { CreateDocFields, DeleteDocFields, CopyCutFields } from '../type';

export const menuModifyRouter = express.Router();

menuModifyRouter.post('/createDoc', (req, res) => {
  const { path, isFile } = req.fields as CreateDocFields;

  try {
    docer.createDoc(path, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

menuModifyRouter.delete('/deleteDoc', (req, res) => {
  const { path, isFile } = req.fields as DeleteDocFields;

  try {
    docer.deleteDoc(path, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

menuModifyRouter.patch('/copyCutDoc', (req, res) => {
  const { copyCutPath, pastePath, isCopy, isFile } = req.fields as CopyCutFields;

  try {
    docer.copyCutDoc(copyCutPath, pastePath, isCopy, isFile);
    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

menuModifyRouter.post('/refresh', (_, res) => {
  docer.refreshDoc();

  return res.send({ err: 0 });
});
