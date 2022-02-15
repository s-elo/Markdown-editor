import express from "express";
import { additDoc } from "../docsOperaiton";

const router = express.Router();

router.post("/", (req, res) => {
  if (!req.fields) return res.send({});

  const { modifyPath, newContent } = req.fields;

  try {
    // 'js-basic-array'
    additDoc(modifyPath as string, newContent as string);

    return res.send({ err: 0 });
  } catch (err) {
    return res.send({ err: 1 });
  }
});

export default router;
