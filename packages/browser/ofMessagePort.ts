import { observable } from "@hullo/core/observable";
import { Duplex, duplex } from "@hullo/core/duplex";
import { subject } from "@hullo/core/operators/subject";

export function ofMessagePort<IN = any, OUT = any>(
  port: MessagePort
): Duplex<MessageChannelData<IN>, OUT> {
  let connected = false;
  let closed = false;
  const queue: Array<
    | { done: true; ack: () => any }
    | { done: false; data: MessageChannelData<IN>; ack: () => any }
  > = [];

  return duplex<MessageChannelData<IN>, OUT>(
    observable(observer => {
      port.addEventListener("open", open);

      return cancel;

      function open() {
        for (let i = 0; i < queue.length; i += 1) {
          const entry = queue[i]!;
          if (entry.done == true) {
            port.close();
          } else {
            if (
              typeof entry.data === "object" &&
              entry.data &&
              "message" in entry.data &&
              "transferable" in entry.data
            ) {
              port.postMessage(entry.data.message, entry.data.transferable);
            } else {
              port.postMessage(entry.data);
            }
          }
          entry.ack();
        }
        connected = true;
        queue.splice(0);

        port.addEventListener("message", message);
        port.addEventListener("error", error);
        port.addEventListener("close", close);
      }

      function message(msgEvent: MessageEvent) {
        observer.next(msgEvent.data);
      }

      function error() {
        closed = true;
        observer.complete();
      }

      function close() {
        closed = true;
        observer.complete();
      }

      function cancel() {
        port.removeEventListener("open", open);
        port.removeEventListener("message", message);
        port.removeEventListener("error", error);
        port.removeEventListener("close", close);
      }
    }).pipe(subject),
    {
      get closed() {
        return closed;
      },

      next(v: MessageChannelData<IN>) {
        if (closed) {
          return Promise.resolve();
        }
        if (connected) {
          port.postMessage(v.message, v.transferable);

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
          port.close();
          return Promise.resolve();
        } else {
          return new Promise<void>(r => {
            queue.push({ done: true, ack: r });
          });
        }
      }
    }
  );
}

interface MessageChannelData<T> {
  message: T;
  transferable?: Transferable[];
}
