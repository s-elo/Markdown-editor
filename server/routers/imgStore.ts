import express from "express";
import docer from "../Docer";
import OSS from "ali-oss";

import {
  UploadFileType,
  uploadParamType,
  deleteImgType,
  RenameType,
} from "../type";

const router = express.Router();
// const imgStoreBaseUrl = `https://sm.ms/api/v2`;

const { region, accessKeyId, accessKeySecret, bucket } = docer.configs;

const client =
  !region || !accessKeyId || !accessKeySecret || !bucket
    ? null
    : new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket,
      });

router.get("/uploadHistory", async (_, res) => {
  if (!client) return res.send({ err: 1, message: "no configs" });

  try {
    const result = await client.list(
      {
        "max-keys": 1000,
        // prefix: "img/",
      },
      {}
    );

    return res.send(result.objects);
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: err });
  }
});

router.post("/upload", async (req, res) => {
  const { imgFile } = req.files as UploadFileType;
  const { fileName } = req.fields as uploadParamType;

  if (!client) return res.send({ err: 1, message: "no configs" });

  try {
    const result = await client.put(`${fileName}`, imgFile.path, {
      timeout: 60000,
      headers: { "x-oss-forbid-overwrite": true },
    });

    return res.send({ err: 0, message: "uploaded!", ...result.res });
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: String(err) });
  }
});

router.delete("/delete", async (req, res) => {
  const { imgName } = req.fields as deleteImgType;

  if (!client) return res.send({ err: 1, message: "no configs or connection" });

  try {
    const result = await client.delete(`${imgName}`);

    return res.send({ err: 0, message: "deleted!", ...result });
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: String(err) });
  }
});

router.patch("/rename", async (req, res) => {
  const { fileName, newName } = req.fields as RenameType;

  if (!client) return res.send({ err: 1, message: "no configs" });

  try {
    await client.copy(newName, fileName);

    const deletRet = await client.delete(fileName);

    return res.send({ err: 0, message: "renamed!", ...deletRet });
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: String(err) });
  }
});

export default router;
