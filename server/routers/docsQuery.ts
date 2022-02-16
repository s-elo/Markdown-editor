import express, { Request } from "express";
import fs from "fs-extra";
import path from "path";

import getDocs, { docRootPath } from "../getDocs";

const router = express.Router();

router.get("/", (_, res) => {
  try {
    return res.send(getDocs(docRootPath));
  } catch (err) {
    return res.send([]);
  }
});

router.get(
  "/article",
  (req: Request<any, any, any, { filePath: string }>, res) => {
    const { filePath } = req.query;

    const md = fs.readFileSync(
      path.resolve(docRootPath, filePath.split("-").join("/") + ".md"),
      "utf-8"
    );

    res.send({ content: md, filePath });
  }
);

export default router;
