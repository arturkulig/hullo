import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation
} from "@hullo/core/Observable";
import { Duplex } from "@hullo/core/Duplex";
import { subject } from "@hullo/core/operators/subject";

export function ofMessagePort(port: MessagePort) {
  return new MessagePortDuplex(port);
}

export class MessagePortDuplex extends Duplex<unknown, unknown> {
  constructor(public readonly port: MessagePort) {
    super(new Observable<unknown>(new MessagesProducer(port)).pipe(subject), {
      get closed() {
        return closed;
      },

      next: (message: unknown) => {
        return this.send({ done: false, message });
      },
      complete: () => {
        return this.send({ done: true });
      }
    });
  }

  post(message: unknown, transfer?: Transferable[]) {
    return this.send({ done: false, message, transfer });
  }

  private send(signal: Signal) {
    if (closed) {
      return Promise.resolve();
    }
    if (signal.done) {
      closed = true;
    }
    if (signal.done == true) {
      this.port.close();
    } else {
      if (signal.transfer) {
        this.port.postMessage(signal.message, signal.transfer);
      } else {
        this.port.postMessage(signal.message);
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

type Signal =
  | { done: false; message: unknown; transfer?: Transferable[] }
  | { done: true };
