import express from "express";
import fs from "fs-extra";
import path from "path";
import open from "open";
import formidableMiddleware from "express-formidable";

import docsQuery from "./routers/docsQuery";
import docsModify from "./routers/docsModify";
import menuModify from "./routers/menuModify";

import getDocs, { docRootPath } from "./getDocs";

const server = express();

const port = 5600;

// const docs = getDocs(docRootPath);
// console.log(docs)
// if (docs[4].children && docs[4].children[0]) {
//   if (docs[4].children[0].children)
//     console.log(docs[4].children[0].children[0].path);
// }
// console.log(docs.length);

// handle formdata and post method
server.use(formidableMiddleware());

server.use("/", express.static(path.resolve(__dirname, "..", "client/build")));

// Cross-Origin Resource Sharing
server.all("*", (_, res, next) => {
  // for complicated request
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,Accept,Content-Type,Referer,sec-ch-ua,sec-ch-ua-mobile,User-Agent"
  );
  res.header("Access-Control-Allow-Origin", `*`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");

  next();
});

const app = server.listen(port, () => {
  console.log(`Listening on port ${port}`);
  const mode = process.argv.slice(2)[0];
  // only for production mode
  if (mode === "production") {
    open(`http://localhost:${port}`);
  }
});

app.on("error", () => {
  // already listened
  open(`http://localhost:${port}`);
});

server.use("/getDocs", docsQuery);
server.use("/editDoc", docsModify);
server.use("/menu", menuModify);

// when no matched, including '/', just return the index.html
server.get("*", (_, res) => {
  const frontPage = fs.readFileSync(
    path.resolve(__dirname, "..", "client/build/index.html"),
    "utf-8"
  );
  return res.send(frontPage);
});
