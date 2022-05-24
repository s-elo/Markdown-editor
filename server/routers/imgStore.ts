import express from "express";
import axios from "axios";
import docer from "../Docer";

import { UploadImgHistoryType, UploadType } from "../type";

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

router.post("/upload", async (req, res) => {
  const { imgFile } = req.files as UploadType;
  const { imgStoreToken } = docer.configs;

  if (!imgStoreToken) {
    return res.send({ err: 1, message: "no token config" });
  }

  // const loginResp = await axios.post(`${imgStoreBaseUrl}/profile`, {
  //   headers: {
  //     Authorization: imgStoreToken,
  //     "Content-Type": "multipart/form-data",
  //   },
  //   // params: {
  //   //   username: "leo_666",
  //   //   password: "Lc0258pop.7458",
  //   // },
  // });
  // console.log(loginResp.data);
  try {
    const resp = await axios.post(`${imgStoreBaseUrl}/upload`, {
      headers: {
        Authorization: imgStoreToken,
        "Content-Type": "multipart/form-data",
      },
      params: {
        smfile: imgFile,
        format: "json",
      },
    });

    return res.send({ err: 0, ...resp.data });
  } catch (err) {
    console.log(err);
    return res.send({ err: 1, message: String(err) });
  }
});

export default router;
