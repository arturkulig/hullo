import { WebSocketBehavior, WebSocket, HttpRequest } from "uWebSockets.js";
import { WebAppLike } from "./types";
import { WebSocketServer } from "./WebSocketServer";

export function createWebSocketServer<SessionData>(
  webApp: WebAppLike<SessionData>,
  wsOptions?: Exclude<WebSocketBehavior, ["open", "message", "drain", "close"]>
): WebSocketBehavior {
  const wSS = new WebSocketServer(webApp, false);

  const behaviour: WebSocketBehavior = {
    ...(wsOptions || {}),

    open(ws: WebSocket, _req: HttpRequest) {
      wSS.open(ws);
    },

    message(ws: WebSocket, message: ArrayBuffer, isBinary: boolean) {
      wSS.message(ws, message, isBinary);
    },

    drain(ws: WebSocket) {
      wSS.drain(ws);
    },

    close(ws: WebSocket, _code: number, _message: ArrayBuffer) {
      wSS.close(ws);
    }
  };

  return behaviour;
}
