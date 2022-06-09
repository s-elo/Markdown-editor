import express from "express";

import docer from "../Docer";

import { CreateDocFields, DeletDocFields, CopyCutFields } from "../type";

const router = express.Router();

router.post("/createDoc", (req, res) => {
  const { path, isFile } = req.fields as CreateDocFields;

  try {
    docer.createDoc(path, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.delete("/deleteDoc", (req, res) => {
  const { path, isFile } = req.fields as DeletDocFields;

  try {
    docer.deleteDoc(path, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.patch("/copyCutDoc", (req, res) => {
  const { copyCutPath, pastePath, isCopy, isFile } =
    req.fields as CopyCutFields;

  try {
    docer.copyCutDoc(copyCutPath, pastePath, isCopy, isFile);
    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.post("/refresh", (_, res) => {
  docer.refreshDoc();

  return res.send({ err: 0 });
});

export default router;
