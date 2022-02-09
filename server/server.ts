import express from "express";
import fs from "fs-extra";
import path from "path";
import showdown from "showdown";

const server = express();

const port = 5600;

// Cross-Origin Resource Sharing
server.all("*", (_, res, next) => {
  res.header("Access-Control-Allow-Origin", `*`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");

  next();
});

server.listen(port, () => console.log(`Listening on port ${port}`));

server.get("/", (_, res) => {
  const file = fs.readFileSync(
    path.resolve(__dirname, "..", "README.md"),
    "utf-8"
  );

  const converter = new showdown.Converter();

  return res.send(converter.makeHtml(file));
});
