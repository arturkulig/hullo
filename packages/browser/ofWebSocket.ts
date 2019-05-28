import { Duplex } from "@hullo/core/Duplex";
import { Channel } from "@hullo/core/Channel";

export function ofWebSocket(
  ws: WebSocket
): Duplex<ArrayBuffer | string, ArrayBuffer | string> {
  ws.binaryType = "arraybuffer";

  const ch = new Channel<ArrayBuffer | string>();

  let connected = false;
  let closed = false;
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
      closed = true;
      ch.complete();
    });

    ws.addEventListener("close", () => {
      closed = true;
      ch.complete();
    });
  });

  return new Duplex<ArrayBuffer | string, ArrayBuffer | string>(ch, {
    get closed() {
      return closed;
    },

    next(v: ArrayBuffer | string) {
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
