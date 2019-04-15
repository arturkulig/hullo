import { Duplex, duplex } from "./duplex";
import { Observer, observable } from "./observable";
import { subject } from "./operators/subject";

export function channel<T>(this: unknown): Channel<T> {
  const wide: ChannelWideContext<T> = {
    buffer: [],
    closed: false,
    remote: undefined,
    nextSafeHandlers: [],
    nextUnsafeHandlers: []
  };
  const o = observable<T, ChannelContext<T>, ChannelWideContext<T>>(
    channelProduce,
    channelContext,
    wide
  ).pipe(subject);

  return Object.assign(
    duplex(
      o,
      {
        get closed() {
          return wide.closed;
        },
        next,
        complete
      },
      wide
    ),
    {
      take(this: unknown) {
        return new Promise<T>((resolve, reject) => {
          wide.nextUnsafeHandlers.push({ resolve, reject });
          Promise.resolve(wide).then(flushBuffer);
        });
      },
      tryTake(this: unknown) {
        return new Promise<ChannelMessage<T>>(resolve => {
          wide.nextSafeHandlers.push(resolve);
          Promise.resolve(wide).then(flushBuffer);
        });
      }
    }
  );
}

function channelContext<T>(arg: ChannelWideContext<T>): ChannelContext<T> {
  return { wide: arg, observer: undefined };
}

function channelProduce<T>(this: ChannelContext<T>, observer: Observer<T>) {
  if (this.wide.closed) {
    observer.complete();
  } else {
    this.wide.remote = observer;
    Promise.resolve(this.wide).then(flushBuffer);
    return channelCancel;
  }
}

function flushBuffer<T>(wideContext: ChannelWideContext<T>) {
  for (const { message, ack } of wideContext.buffer.splice(0)) {
    deliver
      .call<ChannelWideContext<T>, [ChannelMessage<T>], Promise<void>>(
        wideContext,
        message
      )
      .then(ack);
  }
}

function channelCancel<T>(this: ChannelContext<T>) {
  this.wide.remote = undefined;
}

function next<T>(this: ChannelWideContext<T>, value: T) {
  return deliver.call<
    ChannelWideContext<T>,
    [ChannelMessage<T>],
    Promise<void>
  >(this, {
    closed: false,
    value
  });
}

function complete<T>(this: ChannelWideContext<T>) {
  return deliver.call<
    ChannelWideContext<T>,
    [ChannelMessage<T>],
    Promise<void>
  >(this, {
    closed: true
  });
}

function deliver<T>(this: ChannelWideContext<T>, message: ChannelMessage<T>) {
  if (this.closed) {
    return Promise.resolve();
  }

  if (
    this.nextSafeHandlers.length === 0 &&
    this.nextUnsafeHandlers.length === 0 &&
    !this.remote
  ) {
    return new Promise<void>(ack => {
      this.buffer.push({ message, ack });
    });
  }

  if (message.closed) {
    this.closed = true;
  }

  for (const handler of this.nextSafeHandlers.splice(0)) {
    handler(message);
  }
  if (message.closed) {
    for (const handler of this.nextUnsafeHandlers.splice(0)) {
      handler.reject(new Error("Channel closed before it got a message"));
    }
    return this.remote ? this.remote.complete() : Promise.resolve();
  } else {
    for (const handler of this.nextUnsafeHandlers.splice(0)) {
      handler.resolve(message.value);
    }
    return this.remote ? this.remote.next(message.value) : Promise.resolve();
  }
}

export interface Channel<T> extends Duplex<T, T> {
  take(): Promise<T>;
  tryTake(): Promise<ChannelMessage<T>>;
}

interface ChannelWideContext<T> {
  buffer: Array<ChannelMessageDelivery<T>>;
  nextSafeHandlers: Array<(result: ChannelMessage<T>) => any>;
  nextUnsafeHandlers: Array<{
    resolve: (result: T) => any;
    reject: (err: Error) => any;
  }>;
  closed: boolean;
  remote: Observer<T> | undefined;
}

interface ChannelContext<T> {
  wide: ChannelWideContext<T>;
  observer: Observer<T> | undefined;
}

type ChannelMessage<T> = { closed: true } | { closed: false; value: T };
interface ChannelMessageDelivery<T> {
  message: ChannelMessage<T>;
  ack: () => any;
}
