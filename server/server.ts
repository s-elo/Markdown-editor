import express from "express";

const server = express();

const port = 5600;

// Cross-Origin Resource Sharing
server.all("*", (_, res, next) => {
  res.header("Access-Control-Allow-Origin", `*`);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PUT");

  next();
});

server.listen(port, () => console.log(`Listening on port ${port}`));
