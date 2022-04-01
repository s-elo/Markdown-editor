import express from "express";
import fs from "fs-extra";
import { Fields } from "formidable";

import { pathConvertor } from "../docsOperaiton";

const router = express.Router();

type CreateDocFields = Fields & {
  path: string;
  isFile: boolean;
};

type DeletDocFields = CreateDocFields;

type CopyCutFields = Fields & {
  copyCutPath: string;
  pastePath: string;
  isCopy: boolean;
  isFile: boolean;
};

router.post("/createDoc", (req, res) => {
  const { path, isFile } = req.fields as CreateDocFields;

  const createdPath = pathConvertor(path, isFile);

  try {
    if (isFile) {
      fs.ensureFileSync(createdPath);
    } else {
      fs.ensureDirSync(createdPath);
    }

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.delete("/deleteDoc", (req, res) => {
  const { path, isFile } = req.fields as DeletDocFields;

  const deletePath = pathConvertor(path, isFile);

  try {
    fs.removeSync(deletePath);
    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.patch("/copyCutDoc", (req, res) => {
  const { copyCutPath, pastePath, isCopy, isFile } =
    req.fields as CopyCutFields;

  try {
    if (isCopy) {
      fs.copySync(
        pathConvertor(copyCutPath, isFile),
        pathConvertor(pastePath, isFile)
      );
    } else {
      fs.move(
        pathConvertor(copyCutPath, isFile),
        pathConvertor(pastePath, isFile),
        { overwrite: true }
      );
    }
    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

export default router;
