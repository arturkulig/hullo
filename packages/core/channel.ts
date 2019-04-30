import { Duplex } from "./duplex";
import {
  Observer,
  Observable,
  ComplexProducer,
  Cancellation
} from "./observable";
import { subject } from "./operators/subject";

export class Channel<T> extends Duplex<T, T> {
  private context: ChannelContext<T>;

  constructor() {
    const context: ChannelContext<T> = {
      buffer: [],
      closed: false,
      remote: undefined,
      nextSafeHandlers: [],
      nextUnsafeHandlers: []
    };
    const out = new Observable<T>(new ChannelProducer(context)).pipe(subject);
    const ins = new ChannelObserver<T>(context);
    super(out, ins);
    this.context = context;
  }

  take() {
    return new Promise<T>((resolve, reject) => {
      this.context.nextUnsafeHandlers.push({ resolve, reject });
      Promise.resolve(this.context).then(flushBuffer);
    });
  }

  tryTake() {
    return new Promise<ChannelMessage<T>>(resolve => {
      this.context.nextSafeHandlers.push(resolve);
      Promise.resolve(this.context).then(flushBuffer);
    });
  }
}

class ChannelObserver<T> implements Observer<T> {
  get closed() {
    return this.context.closed;
  }

  constructor(private context: ChannelContext<T>) {}

  next(value: T) {
    return deliver(this.context, {
      closed: false,
      value
    });
  }

  complete() {
    return deliver(this.context, {
      closed: true
    });
  }
}

class ChannelProducer<T> implements ComplexProducer<T> {
  constructor(private wide: ChannelContext<T>) {}

  subscribe(observer: Observer<T>) {
    if (this.wide.closed) {
      observer.complete();
    } else {
      this.wide.remote = observer;
      Promise.resolve(this.wide).then(flushBuffer);
      return new ChannelCancel(this.wide);
    }
  }
}

class ChannelCancel<T> implements Cancellation {
  constructor(private wide: ChannelContext<T>) {}

  cancel() {
    this.wide.remote = undefined;
  }
}

function flushBuffer<T>(wideContext: ChannelContext<T>) {
  for (const { message, ack } of wideContext.buffer.splice(0)) {
    deliver(wideContext, message).then(ack);
  }
}

function deliver<T>(context: ChannelContext<T>, message: ChannelMessage<T>) {
  if (context.closed) {
    return Promise.resolve();
  }

  if (
    context.nextSafeHandlers.length === 0 &&
    context.nextUnsafeHandlers.length === 0 &&
    !context.remote
  ) {
    return new Promise<void>(ack => {
      context.buffer.push({ message, ack });
    });
  }

  if (message.closed) {
    context.closed = true;
  }

  for (const handler of context.nextSafeHandlers.splice(0)) {
    handler(message);
  }
  if (message.closed) {
    for (const handler of context.nextUnsafeHandlers.splice(0)) {
      handler.reject(new Error("Channel closed before it got a message"));
    }
    return context.remote ? context.remote.complete() : Promise.resolve();
  } else {
    for (const handler of context.nextUnsafeHandlers.splice(0)) {
      handler.resolve(message.value);
    }
    return context.remote
      ? context.remote.next(message.value)
      : Promise.resolve();
  }
}

interface ChannelContext<T> {
  buffer: Array<ChannelMessageDelivery<T>>;
  nextSafeHandlers: Array<(result: ChannelMessage<T>) => any>;
  nextUnsafeHandlers: Array<{
    resolve: (result: T) => any;
    reject: (err: Error) => any;
  }>;
  closed: boolean;
  remote: Observer<T> | undefined;
}

type ChannelMessage<T> = { closed: true } | { closed: false; value: T };
interface ChannelMessageDelivery<T> {
  message: ChannelMessage<T>;
  ack: () => any;
}
