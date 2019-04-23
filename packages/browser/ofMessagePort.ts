import { observable } from "@hullo/core/observable";
import { duplex, Duplex } from "@hullo/core/duplex";
import { subject } from "@hullo/core/operators/subject";

export interface MessagePortDuplex<IN, OUT> extends Duplex<IN, OUT> {
  post(message: IN, transferable?: Transferable[]): Promise<void>;
}

export function ofMessagePort<IN = any, OUT = IN>(
  port: MessagePort
): MessagePortDuplex<IN, OUT> {
  let closed = false;

  return Object.assign(
    duplex<IN, OUT>(
      observable(observer => {
        port.addEventListener("message", message);
        port.addEventListener("error", error);
        port.addEventListener("close", close);

        return cancel;

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
          port.removeEventListener("message", message);
          port.removeEventListener("error", error);
          port.removeEventListener("close", close);
        }
      }).pipe(subject),
      {
        get closed() {
          return closed;
        },

        next,
        complete
      }
    ),
    {
      post(message: IN, transfer?: Transferable[]) {
        return send({ done: false, message, transfer });
      }
    }
  );

  function next(message: IN) {
    return send({ done: false, message });
  }

  function complete() {
    return send({ done: true });
  }

  function send(signal: Signal<IN>) {
    if (closed) {
      return Promise.resolve();
    }
    if (signal.done) {
      closed = true;
    }
    if (signal.done == true) {
      port.close();
    } else {
      if (signal.transfer) {
        port.postMessage(signal.message, signal.transfer);
      } else {
        port.postMessage(signal.message);
      }
    }
    return Promise.resolve();
  }
}

export interface MessageChannelData<T> {
  message: T;
  transfer?: Transferable[];
}

type Signal<T> =
  | { done: false; message: T; transfer?: Transferable[] }
  | { done: true };
