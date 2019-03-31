import { Duplex, duplex } from "@hullo/core/duplex";
import { channel } from "@hullo/core/channel";

export async function ofWebSocket(
  ws: WebSocket
): Promise<Duplex<WebSocketData, WebSocketEvent>> {
  const ch = channel<WebSocketEvent>();

  let open = false;
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
    queue.splice(0);
    open = true;

    ws.addEventListener("message", msgEvent => {
      ch.next({ ok: true, data: msgEvent.data });
    });

    ws.addEventListener("error", () => {
      ch.next({ ok: false });
      ch.complete();
    });

    ws.addEventListener("close", () => {
      ch.complete();
    });
  });

  return duplex<WebSocketData, WebSocketEvent>(ch, {
    next(v: WebSocketData) {
      if (open) {
        ws.send(v);
        return Promise.resolve();
      } else {
        return new Promise<void>(r => {
          queue.push({ done: false, data: v, ack: r });
        });
      }
    },
    complete() {
      if (open) {
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

type WebSocketEvent = { ok: true; data: WebSocketData } | { ok: false };

type WebSocketData =
  | string
  | ArrayBuffer
  | SharedArrayBuffer
  | ArrayBufferView
  | Blob;
