import express from "express";
import { Fields } from "formidable";
import { additDoc } from "../docsOperaiton";

const router = express.Router();

type EditDocFields = Fields & {
  modifyPath: string;
  newContent: string;
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

export default router;
