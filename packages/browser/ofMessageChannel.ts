import { Duplex, duplex, observable, subject } from "@hullo/core";

export async function ofMessagePort<IN = any, OUT = any>(
  port: MessagePort
): Promise<Duplex<MessageChannelData<IN>, MessageChannelEvent<OUT>>> {
  let isOpen = false;
  const queue: Array<
    | { done: true; ack: () => any }
    | { done: false; data: MessageChannelData<IN>; ack: () => any }
  > = [];

  return duplex<MessageChannelData<IN>, MessageChannelEvent<OUT>>(
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
        queue.splice(0);
        isOpen = true;

        port.addEventListener("message", message);
        port.addEventListener("error", error);
        port.addEventListener("close", close);
      }

      function message(msgEvent: MessageEvent) {
        observer.next({ ok: true, message: msgEvent.data });
      }

      function error() {
        observer.next({ ok: false });
        observer.complete();
      }

      function close() {
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
      next(v: MessageChannelData<IN>) {
        if (isOpen) {
          if (
            typeof v === "object" &&
            v &&
            "message" in v &&
            "transferable" in v
          ) {
            port.postMessage(v.message, v.transferable);
          } else {
            port.postMessage(v);
          }
          return Promise.resolve();
        } else {
          return new Promise<void>(r => {
            queue.push({ done: false, data: v, ack: r });
          });
        }
      },
      complete() {
        if (isOpen) {
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

type MessageChannelEvent<T> = { ok: true; message: T } | { ok: false };

type MessageChannelData<T> =
  | T
  | {
      message: T;
      transferable: Transferable[];
    };
