import express from "express";
import axios from "axios";
import docer from "../Docer";

import { UploadImgHistoryType } from "../type";

const router = express.Router();
const imgStoreBaseUrl = `https://sm.ms/api/v2`;

router.get("/uploadHistory", async (_, res) => {
  const { imgStoreToken } = docer.configs;

  if (!imgStoreToken) {
    return res.send({ err: 1, message: "no token config" });
  }

  try {
    const resp = await axios.get<UploadImgHistoryType>(
      `${imgStoreBaseUrl}/upload_history`,
      {
        headers: {
          Authorization: imgStoreToken,
          "Content-Type": "multipart/form-data",
        },
        //   params: {

        //   }
      }
    );

    return res.send(resp.data.data);
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: err });
  }
});

export default router;
