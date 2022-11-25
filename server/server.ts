import express from "express";
import fs from "fs-extra";
import path from "path";
import open from "open";
import formidableMiddleware from "express-formidable";

import docsQuery from "./routers/docsQuery";
import docsModify from "./routers/docsModify";
import menuModify from "./routers/menuModify";
import gitOperation from "./routers/gitOperation";
import imgStore from "./routers/imgStore";
import configRouter from "./routers/configsRouter";

import docer from "./Docer";

const mode = process.argv.slice(2)[0];

const server = express();

const port = mode === "production" ? 3022 : 3024;

server.use("/", express.static(path.resolve(__dirname, "..", "client/build")));

// Cross-Origin Resource Sharing
server.all("*", (req, res, next) => {
  // for complicated request
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,Accept,Content-Type,Referer,sec-ch-ua,sec-ch-ua-mobile,User-Agent"
  );
  res.header("Access-Control-Allow-Origin", `*`);
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, DELETE, PUT, PATCH"
  );

  next();
});

// handle formdata and post method
server.use(formidableMiddleware());

const initGitPull = async () => {
  console.log("git initially pulling...");

  try {
    await docer.git?.pull();
    console.log(" doc is updated!");
  } catch (e) {
    console.log(`failed to pull doc: ${(e as Error).message}`);
  }
};

const app = server.listen(port, async () => {
  // only for production mode
  if (mode === "production") {
    await initGitPull();
    open(`http://localhost:${port}`);
  }

  console.log(`Listening on port ${port}`);
});

app.on("error", () => {
  // already listened
  open(`http://localhost:${port}`);
});

server.use("/getDocs", docsQuery);
server.use("/editDoc", docsModify);
server.use("/menu", menuModify);
server.use("/git", gitOperation);
server.use("/imgStore", imgStore);
server.use("/config", configRouter);

// when no matched, including '/', just return the index.html
server.get("*", (_, res) => {
  const frontPage = fs.readFileSync(
    path.resolve(__dirname, "..", "client/build/index.html"),
    "utf-8"
  );
  return res.send(frontPage);
});
