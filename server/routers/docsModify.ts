import express from 'express';

import { docer } from '../Docer';
import { EditDocFields, ModifyNameFields } from '../type';

export const docsModifyRouter = express.Router();

docsModifyRouter.patch('/', (req, res) => {
  const { modifyPath, newContent } = req.fields as EditDocFields;

  try {
    // 'js-basic-array'
    docer.updateArticle(modifyPath, newContent);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

docsModifyRouter.patch('/modifyName', (req, res) => {
  const { modifyPath, newName, isFile } = req.fields as ModifyNameFields;

  try {
    // 'js-basic-array'
    docer.modifyName(modifyPath, newName, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});
