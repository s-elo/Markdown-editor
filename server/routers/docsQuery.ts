import express from "express";
import fs from "fs-extra";
import { Fields } from "formidable";
import { pathConvertor } from "../docsOperaiton";

import getDocs, { docRootPath, docExtractor } from "../getDocs";

type GetDocType = Fields & {
  filePath: string;
};

const router = express.Router();

router.get("/", (_, res) => {
  try {
    // console.time();
    const docs = getDocs(docRootPath);
    // console.timeEnd();
    return res.send(docs);
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

  const { headings, keywords } = docExtractor(md);

  res.send({
    content: md,
    filePath,
    headings,
    keywords: keywords.map((word) => word.replace(/\*\*/g, "")),
  });
});

export default router;
