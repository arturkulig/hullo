import { readFileSync } from "fs";
import { resolve } from "path";
import { compress } from "brotli";
//
import { WebSocketServer, WebApp } from "@hullo/webapp";
import { App } from "uWebSockets.js";
import { responders } from "./responders";

//

App()
  // websocket application
  .ws("/ws", new WebSocketServer(new WebApp(id => id, responders)))
  //
  // browser application files server
  .get("/", (res, _req) => {
    res.writeStatus("200 OK");
    res.writeHeader("Content-type", "text/html");
    res.writeHeader("Content-Encoding", "br");
    res.end(readFrontendFiles("index.html"));
  })
  .get("/main.js", (res, _req) => {
    res.writeStatus("200 OK");
    res.writeHeader("Content-type", "application/javascript");
    res.writeHeader("Content-Encoding", "br");
    res.end(readFrontendFiles("main.js"));
  })
  // start the server
  .listen(8000, () => {
    console.log("started the app");
    console.log("http://localhost:8000");
  });

//

function readFrontendFiles(path: string) {
  return compress(
    readFileSync(resolve(__dirname, `../testappfe/dist/${path}`))
  );
}
