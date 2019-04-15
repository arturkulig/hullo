import { Duplex, duplex } from "@hullo/core/duplex";
import { channel } from "@hullo/core/channel";

export function ofWebSocket(
  ws: WebSocket
): Duplex<WebSocketData, WebSocketData> {
  const ch = channel<WebSocketData>();

  let connected = false;
  let closed = false;
  const queue: Array<
    | { done: true; ack: () => any }
    | { done: false; data: WebSocketData; ack: () => any }
  > = [];

  ws.addEventListener("open", () => {
    for (let i = 0; i < queue.length; i += 1) {
      const entry = queue[i];
      if (entry.done) {
        ws.close();
      } else {
        ws.send(entry.data);
      }
      entry.ack();
    }
    connected = true;
    queue.splice(0);

    ws.addEventListener("message", msgEvent => {
      ch.next(msgEvent.data);
    });

    ws.addEventListener("error", () => {
      closed = true;
      ch.complete();
    });

    ws.addEventListener("close", () => {
      closed = true;
      ch.complete();
    });
  });

  return duplex<WebSocketData, WebSocketData>(ch, {
    get closed() {
      return closed;
    },

    next(v: WebSocketData) {
      if (closed) {
        return Promise.resolve();
      }
      if (connected) {
        ws.send(v);
        return Promise.resolve();
      } else {
        return new Promise<void>(r => {
          queue.push({ done: false, data: v, ack: r });
        });
      }
    },

    complete() {
      if (closed) {
        return Promise.resolve();
      }
      closed = true;
      if (connected) {
        ws.close();
        return Promise.resolve();
      } else {
        return new Promise<void>(r => {
          queue.push({ done: true, ack: r });
        });
      }
    }
  });
}

type WebSocketData =
  | string
  | ArrayBuffer
  | SharedArrayBuffer
  | ArrayBufferView
  | Blob;
