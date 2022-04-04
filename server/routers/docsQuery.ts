import express, { Request } from "express";
import fs from "fs-extra";
import { Fields } from "formidable";
import { pathConvertor } from "../docsOperaiton";

import getDocs, { docRootPath } from "../getDocs";

type GetDocType = Fields & {
  filePath: string;
};

const router = express.Router();

router.get("/", (_, res) => {
  try {
    return res.send(getDocs(docRootPath));
  } catch (err) {
    return res.send([]);
  }
});

router.get("/article", (req, res) => {
  const { filePath } = req.query as GetDocType;

  // not exsit means new article
  if (!fs.existsSync(pathConvertor(filePath, true))) {
    return res.send({ content: "", filePath });
  }

  const md = fs.readFileSync(pathConvertor(filePath, true), "utf-8");

  res.send({ content: md, filePath });
});

export default router;
