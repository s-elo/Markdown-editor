import express from "express";
import fs from "fs-extra";
import docer from "../Docer";
import OSS from "ali-oss";

import { UploadType } from "../type";

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

const readFileAsBuffer = (file: File) => {
  const reader = new FileReader();
  return new Promise<Buffer>((resolve, reject) => {
    reader.readAsDataURL(file);
    reader.onload = function () {
      if (reader.result) {
        const base64File = (reader.result as string).replace(
          /^data:\w+\/\w+;base64,/,
          ""
        );
        resolve(Buffer.from(base64File));
      }
    };
  });
};

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
  const { imgFile } = req.files as UploadType;

  if (!client) return res.send({ err: 1, message: "no configs" });

  try {
    const result = await client.put(`${imgFile.name}`, imgFile.path);

    return res.send({ err: 0, message: 'uploaded!', ...result.res });
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: String(err) });
  }
});

export default router;
