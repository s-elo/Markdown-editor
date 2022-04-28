import express from "express";
import simpleGit from "simple-git";
import { Fields } from "formidable";
import { docRootPath } from "../getDocs";

const router = express.Router();

const git = simpleGit(docRootPath);

router.get("/getStatus", async (_, res) => {
  try {
    const { files } = await git.status();

    // just check if committed
    return res.send({ changes: files.length !== 0, noGit: false });
  } catch {
    return res.send({ noGit: true });
  }
});

type CommitType = Fields & {
  message: string;
};
router.post("/commit", async (req, res) => {
  const { message } = req.fields as CommitType;

  try {
    const { tracking } = await git.status();

    await git.add("./*").commit(message).push(tracking?.split("/"));
    return res.send({ err: false });
  } catch {
    return res.send({ err: true });
  }
});

router.post("/pull", async (_, res) => {
  try {
    await git.pull();
    return res.send({ err: false });
  } catch {
    return res.send({ err: true });
  }
});

export default router;
