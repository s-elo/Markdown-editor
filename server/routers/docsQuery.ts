import express from "express";

import docer from "../Docer";
import { GetDocType } from "../type";

const router = express.Router();

router.get("/", (_, res) => {
  try {
    // console.time();
    const docs = docer.docs;
    // console.timeEnd();
    return res.send(docs);
  } catch (err) {
    return res.send([]);
  }
});

router.get("/norDocs", (_, res) => {
  try {
    const docs = docer.norDocs;
    return res.send(docs);
  } catch (err) {
    return res.send({});
  }
});

router.get("/article", (req, res) => {
  const { filePath } = req.query as GetDocType;

  return res.send(docer.getArticle(filePath));
});

export default router;
