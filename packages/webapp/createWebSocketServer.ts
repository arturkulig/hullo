import { WebSocketBehavior, WebSocket, HttpRequest } from "uWebSockets.js";
import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";
import { Observer } from "@hullo/core/Observable";
import { Atom } from "@hullo/core/Atom";
import { WebApp } from "./types";
import { messagepackContent, jsonContent } from "./utils";
import { serialize } from "@hullo/messagepack";

type MessageQueueEntry =
  | { type: "complete"; ack: () => any }
  | { type: "value"; value: unknown; ack: () => any };

interface ConnectionState<SessionData> {
  id: number;
  active: boolean;
  sessionData$: Atom<SessionData>;
  msgQueue: MessageQueueEntry[];
  incoming$: Channel<unknown>;
}

export function createWebSocketServer<SessionData>(
  wsOptions: null | Exclude<
    WebSocketBehavior,
    ["open", "message", "drain", "close"]
  >,
  webApp: WebApp<SessionData>
): WebSocketBehavior {
  const socketToConnectionState = new Map<
    WebSocket,
    ConnectionState<SessionData>
  >();

  let lastID = 0;

  const behaviour: WebSocketBehavior = {
    ...(wsOptions || {}),

    /** Handler for new WebSocket connection. WebSocket is valid from open to close, no errors. */
    open(ws: WebSocket, _req: HttpRequest) {
      // establish the session
      const incoming$ = new Channel<unknown>();
      const id = lastID++;
      const connectionState: ConnectionState<SessionData> = {
        id,
        active: true,
        incoming$,
        sessionData$: new Atom(webApp.createSession(id)),
        msgQueue: []
      };
      socketToConnectionState.set(ws, connectionState);

      const commandResultHandler: Observer<unknown> = {
        get closed() {
          return !connectionState.active;
        },
        next(value) {
          return new Promise<void>(resolve => {
            connectionState.msgQueue.push({
              type: "value",
              value,
              ack: resolve
            });
            trySendingMessages(ws);
          });
        },
        complete() {
          return new Promise<void>(resolve => {
            connectionState.active = false;
            connectionState.msgQueue.push({ type: "complete", ack: resolve });
            trySendingMessages(ws);
          });
        }
      };

      webApp.handleConnection({
        sessionData$: connectionState.sessionData$,
        io$: new Duplex<unknown, unknown>(incoming$, commandResultHandler),
        id: connectionState.id
      });
    },

    /** Handler for a WebSocket message. */
    message(ws: WebSocket, message: ArrayBuffer, isBinary: boolean) {
      const connectionState = socketToConnectionState.get(ws)!;
      connectionState.incoming$.next(
        (isBinary ? messagepackContent : jsonContent)(message)
      );
    },

    /** Handler for when WebSocket backpressure drains. Check ws.getBufferedAmount(). */
    drain(ws: WebSocket) {
      trySendingMessages(ws);
    },

    /** Handler for close event, no matter if error, timeout or graceful close. You may not use WebSocket after this event. */
    close(ws: WebSocket, _code: number, _message: ArrayBuffer) {
      const state = socketToConnectionState.get(ws)!;
      state.active = false;
      state.incoming$.complete();
      state.msgQueue.splice(0);
      socketToConnectionState.delete(ws);
    }
  };

  return behaviour;

  function trySendingMessages(ws: WebSocket) {
    const connectionState = socketToConnectionState.get(ws)!;
    while (connectionState.msgQueue.length) {
      if (ws.getBufferedAmount() !== 0) {
        return;
      }
      const messageQueueEntry = connectionState.msgQueue.shift()!;
      switch (messageQueueEntry.type) {
        case "value":
          ws.send(serialize(messageQueueEntry.value), true, false);
          messageQueueEntry.ack();
          break;

        case "complete":
          ws.close();
          messageQueueEntry.ack();
          break;
      }
    }
  }
}
