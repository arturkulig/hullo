import * as cookie from "cookie";
import {
  WebSocketBehavior,
  WebSocket,
  HttpRequest,
  TemplatedApp,
  RecognizedString
} from "uWebSockets.js";
import { Duplex, Channel } from "@hullo/core";
import { RespondersTemplate } from "./Responders";
import { AppConfig } from "./AppConfig";
import {
  getSessionKey,
  getAllHeaders,
  getSessionId,
  messagepackContent,
  jsonContent
} from "./creationUtils";
import { Connection } from "./Connection";

interface State {
  connection: Connection;
  channels: Duplex<unknown, unknown>[];
}

export function createWSApp<Session, Template extends RespondersTemplate>(
  app: TemplatedApp,
  path: RecognizedString,
  options: AppConfig<Session, Template>,
  wsOptions?: Exclude<WebSocketBehavior, ["open", "message", "drain", "close"]>
): TemplatedApp {
  const ws2State = new Map<WebSocket, State>();

  const behaviour: WebSocketBehavior = {
    ...(wsOptions || {}),
    /** Handler for new WebSocket connection. WebSocket is valid from open to close, no errors. */
    open(ws: WebSocket, req: HttpRequest) {
      // establish the session
      const sentInId = cookie.parse(req.getHeader("cookie") || "")[
        getSessionKey(options.appName)
      ];
      const id = getSessionId(sentInId);

      const connection = {
        id,
        live: false,
        headers: getAllHeaders(req)
      };

      ws2State.set(ws, { connection, channels: [] });
    },
    /** Handler for a WebSocket message. */
    message(ws: WebSocket, message: ArrayBuffer, isBinary: boolean) {
      const request = isBinary
        ? messagepackContent(message)
        : jsonContent(message);

      if (!Array.isArray(request)) {
        ws.close();
        return;
      }

      const [channel] = request;
    },
    /** Handler for when WebSocket backpressure drains. Check ws.getBufferedAmount(). */
    drain(ws: WebSocket) {},
    /** Handler for close event, no matter if error, timeout or graceful close. You may not use WebSocket after this event. */
    close(ws: WebSocket, code: number, message: ArrayBuffer) {}
  };

  return app.ws(path, behaviour);
}
