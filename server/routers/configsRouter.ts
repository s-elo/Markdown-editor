import express from "express";
import fs from "fs-extra";
import path from "path";
import docer from "../Docer";
import { UpdateConfigPayload } from "../type";

const router = express.Router();

router.get("/getConfigs", (_, res) => {
  return res.send({ configs: docer.configs, err: 1, message: "success" });
});

router.post("/updateConfig", async (req, res) => {
  const { configs } = req.fields as UpdateConfigPayload;

  try {
    await fs.writeFile(
      path.resolve(__dirname, "../../", "config.json"),
      JSON.stringify(configs)
    );

    // update docer
    docer.updateConfigs(configs);

    return res.send({ err: 0, message: "updated" });
  } catch (err) {
    return res.send({ err: 1, message: String(err) });
  }
});

export default router;
