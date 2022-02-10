import express from "express";
import fs from "fs-extra";
import path from "path";
import showdown from "showdown";
import open from "open";

const server = express();

const port = 5600;

server.use("/", express.static(path.resolve(__dirname, "..", "client/build")));

// Cross-Origin Resource Sharing
server.all("*", (_, res, next) => {
  res.header("Access-Control-Allow-Origin", `localhost`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");

  next();
});

const app = server.listen(port, () => {
  console.log(`Listening on port ${port}`);
  open(`http://localhost:${port}`);
});

app.on("error", () => {
  // already listened
  open(`http://localhost:${port}`);
});

server.get("/", (_, res) => {
  const frontPage = fs.readFileSync(
    path.resolve(__dirname, "..", "client/build/index.html"),
    "utf-8"
  );
  return res.send(frontPage);
});
server.get("/get-article", (_, res) => {
  const file = fs.readFileSync(
    path.resolve(__dirname, "..", "README.md"),
    "utf-8"
  );

  const converter = new showdown.Converter();

  return res.send(converter.makeHtml(file));
});
