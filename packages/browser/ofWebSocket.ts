import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";

export type WebSocketIO = Duplex<ArrayBuffer | string, ArrayBuffer | string>;

export function ofWebSocket(ws: WebSocket): WebSocketIO {
  ws.binaryType = "arraybuffer";

  const ch = new Channel<ArrayBuffer | string>();

  let connected = false;
  const queue: Array<
    | { done: true; ack: () => any }
    | { done: false; data: ArrayBuffer | string; ack: () => any }
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
      const data: string | ArrayBuffer = msgEvent.data;
      ch.next(data);
    });

    ws.addEventListener("error", () => {
      ch.complete();
    });

    ws.addEventListener("close", () => {
      ch.complete();
    });
  });

  return new Duplex<ArrayBuffer | string, ArrayBuffer | string>(ch, {
    get closed() {
      return (
        ws.readyState === WebSocket.CLOSING ||
        ws.readyState === WebSocket.CLOSED
      );
    },

    next(v: ArrayBuffer | string) {
      if (this.closed) {
        return Promise.resolve();
      }
      if (connected) {
        ws.send(v);
        return Promise.resolve();
      }
      return new Promise<void>(r => {
        queue.push({ done: false, data: v, ack: r });
      });
    },

    complete() {
      if (this.closed) {
        return Promise.resolve();
      }
      if (connected) {
        ws.close();
        return Promise.resolve();
      }
      return new Promise<void>(r => {
        queue.push({ done: true, ack: r });
      });
    }
  });
}
