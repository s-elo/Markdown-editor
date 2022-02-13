import express from "express";
import fs from "fs-extra";
import path from "path";
import open from "open";

import docsQuery from "./routers/docsQuery";

const server = express();

const port = 5620;

server.use("/", express.static(path.resolve(__dirname, "..", "client/build")));

// Cross-Origin Resource Sharing
server.all("*", (_, res, next) => {
  res.header("Access-Control-Allow-Origin", `*`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");

  next();
});

const app = server.listen(port, () => {
  console.log(`Listening on port ${port}`);
  // open(`http://localhost:${port}`);
});

app.on("error", () => {
  // already listened
  open(`http://localhost:${port}`);
});

server.use("/getDocs", docsQuery);

server.get("/", (_, res) => {
  const frontPage = fs.readFileSync(
    path.resolve(__dirname, "..", "client/build/index.html"),
    "utf-8"
  );
  return res.send(frontPage);
});
