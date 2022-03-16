import express from "express";
import { Fields } from "formidable";
import { additDoc, modifyName } from "../docsOperaiton";

const router = express.Router();

type EditDocFields = Fields & {
  modifyPath: string;
  newContent: string;
};

type ModifyNameFields = Fields & {
  modifyPath: string;
  newName: string;
  isFile: boolean;
};

router.patch("/", (req, res) => {
  const { modifyPath, newContent } = req.fields as EditDocFields;

  try {
    // 'js-basic-array'
    additDoc(modifyPath, newContent);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

router.patch("/modifyName", (req, res) => {
  const { modifyPath, newName, isFile } = req.fields as ModifyNameFields;

  try {
    // 'js-basic-array'
    modifyName(modifyPath, newName, isFile);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

export default router;
