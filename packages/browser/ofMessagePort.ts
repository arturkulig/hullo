import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation
} from "@hullo/core/Observable";
import { Duplex } from "@hullo/core/Duplex";
import { subject } from "@hullo/core/operators/subject";

export interface MessagePortDuplex<IN, OUT> extends Duplex<IN, OUT> {
  post(message: IN, transferable?: Transferable[]): Promise<void>;
}

export function ofMessagePort<IN = any, OUT = IN>(
  port: MessagePort
): MessagePortDuplex<IN, OUT> {
  let closed = false;

  return Object.assign(
    new Duplex<IN, OUT>(
      new Observable<OUT>(new MessagesProducer(port)).pipe(subject),
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

class MessagesProducer<T> implements ComplexProducer<T> {
  constructor(private port: MessagePort) {}

  subscribe(observer: Observer<T>) {
    this.port.addEventListener("message", message);
    this.port.addEventListener("error", error);
    this.port.addEventListener("close", close);

    return new MessagesCancel(this.port, message, error, close);

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
  }
}

class MessagesCancel implements Cancellation {
  constructor(
    private port: MessagePort,
    private message: (...args: any[]) => any,
    private error: (...args: any[]) => any,
    private close: (...args: any[]) => any
  ) {}

  cancel() {
    this.port.removeEventListener("message", this.message);
    this.port.removeEventListener("error", this.error);
    this.port.removeEventListener("close", this.close);
  }
}

export interface MessageChannelData<T> {
  message: T;
  transfer?: Transferable[];
}

type Signal<T> =
  | { done: false; message: T; transfer?: Transferable[] }
  | { done: true };
