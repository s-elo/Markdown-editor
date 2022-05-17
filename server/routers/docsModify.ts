import express from "express";
import { EditDocFields, ModifyNameFields } from "../type";

import docer from "../Docer";

const router = express.Router();

router.patch("/", (req, res) => {
  const { modifyPath, newContent } = req.fields as EditDocFields;

  try {
    // 'js-basic-array'
    docer.updateArticle(modifyPath, newContent);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.patch("/modifyName", (req, res) => {
  const { modifyPath, newName, isFile } = req.fields as ModifyNameFields;

  try {
    // 'js-basic-array'
    docer.modifyName(modifyPath, newName, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

export default router;
