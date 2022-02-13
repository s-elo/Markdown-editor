import express from "express";
import getDocs, { docPath } from "../getDocs";

const router = express.Router();

router.get("/", (_, res) => {
  try {
    return res.send(getDocs(docPath));
  } catch (err) {
    return res.send([]);
  }
});

export default router;
