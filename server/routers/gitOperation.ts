import express from "express";
import fs from "fs-extra";
import path from "path";
import { SimpleGit } from "simple-git";
import docer from "../Docer";

import {
  CommitType,
  GitRestoreType,
  GitAddType,
  Change,
  StatusType,
} from "../type";

const router = express.Router();

router.use(async (_, res, next) => {
  const { git } = docer;
  if (!git)
    return res.send({ noGit: true, err: 0, message: "invalid doc path" });
  if (!(await git.checkIsRepo()))
    return res.send({ noGit: true, err: 0, message: "no git repo" });

  next();
});

router.get("/getStatus", async (_, res) => {
  const git = docer.git as SimpleGit;

  const statusMap = {
    A: "ADDED",
    M: "MODIFIED",
    D: "DELETED",
    U: "UNTRACKED",
  };

  try {
    const { files } = await git.status();

    const workSpace: Change[] = [];
    const staged: Change[] = [];

    for (const { path, index, working_dir } of files) {
      // untracked
      if (working_dir.trim() === "?" && index.trim() === "?") {
        workSpace.push({
          changePath: path,
          status: "UNTRACKED",
        });

        continue;
      }

      if (working_dir.trim() !== "") {
        workSpace.push({
          changePath: path,
          status: statusMap[
            working_dir as keyof typeof statusMap
          ] as StatusType,
        });
      }

      if (index.trim() !== "") {
        staged.push({
          changePath: path,
          status: statusMap[index as keyof typeof statusMap] as StatusType,
        });
      }
    }

    return res.send({
      workSpace,
      staged,
      changes: files.length !== 0,
      noGit: false,
      err: 0,
    });
  } catch {
    return res.send({ err: 1, message: "can not get the status" });
  }
});

router.post("/add", async (req, res) => {
  const git = docer.git as SimpleGit;

  const { changePaths } = req.fields as GitAddType;

  try {
    await git.add(changePaths);
  } catch {
    return res.send({
      err: 1,
      message: `failed to add`,
    });
  }

  return res.send({
    err: 0,
    message: `added`,
  });
});

router.post("/restore", async (req, res) => {
  const git = docer.git as SimpleGit;

  const { staged, changes } = req.fields as GitRestoreType;

  try {
    if (staged) {
      await git.raw([
        "restore",
        "--staged",
        ...changes.map((change) => change.changePath),
      ]);
    } else {
      // at the working space
      const unTracked = changes.filter(
        (change) => change.status === "UNTRACKED"
      );

      // delete the untracked files
      for (const change of unTracked) {
        try {
          fs.removeSync(path.resolve(docer.docRootPath, change.changePath));
        } catch {
          return res.send({
            err: 1,
            message: `can not delete ${change.changePath}`,
          });
        }
      }

      if (unTracked.length < changes.length) {
        await git.raw([
          "restore",
          ...changes
            .filter((change) => change.status !== "UNTRACKED")
            .map((change) => change.changePath),
        ]);
      }
    }
  } catch {
    return res.send({
      err: 1,
      message: `failed to restored`,
    });
  } finally {
    docer.refreshDoc();
  }

  return res.send({ err: 0, message: "restored" });
});

router.post("/commit", async (req, res) => {
  const git = docer.git as SimpleGit;

  const { title, body } = req.fields as CommitType;

  try {
    await git.commit([title, body]);
    return res.send({ err: 0, message: "committed" });
  } catch {
    return res.send({ err: 1, message: "failed to commit" });
  }
});

router.post("/pull", async (_, res) => {
  const git = docer.git as SimpleGit;

  try {
    await git.pull();
    return res.send({ err: 0, message: "pulled" });
  } catch {
    return res.send({ err: 1, message: "failed to pull" });
  }
});

router.post("/push", async (_, res) => {
  const git = docer.git as SimpleGit;

  try {
    await git.raw("push");
    return res.send({ err: 0, message: "pushed" });
  } catch {
    return res.send({ err: 1, message: "failed to push" });
  }
});

export default router;
