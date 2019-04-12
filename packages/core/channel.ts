import { Duplex, duplex } from "./duplex";
import { Observer, observable } from "./observable";
import { subject } from "./operators/subject";

export function channel<T>(): Channel<T> {
  const wide: ChannelWideContext<T> = {
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

  return Object.assign(duplex(o, { next, complete }, wide), {
    take() {
      return new Promise<T>((resolve, reject) => {
        wide.nextUnsafeHandlers.push({ resolve, reject });
      });
    },
    tryTake() {
      return new Promise<{ closed: true } | { closed: false; value: T }>(
        resolve => {
          wide.nextSafeHandlers.push(resolve);
        }
      );
    }
  });
}

function channelContext<T>(arg: ChannelWideContext<T>): ChannelContext<T> {
  return { wide: arg, observer: undefined };
}

function channelProduce<T>(this: ChannelContext<T>, observer: Observer<T>) {
  if (this.wide.closed) {
    observer.complete();
  } else {
    this.wide.remote = observer;
    return channelCancel;
  }
}

function channelCancel<T>(this: ChannelContext<T>) {
  this.wide.remote = undefined;
}

function next<T>(this: ChannelWideContext<T>, value: T) {
  if (this.closed) {
    return Promise.resolve();
  }
  for (const handler of this.nextSafeHandlers.splice(0)) {
    handler({ closed: false, value });
  }
  for (const handler of this.nextUnsafeHandlers.splice(0)) {
    handler.resolve(value);
  }
  return this.remote ? this.remote.next(value) : Promise.resolve();
}

function complete<T>(this: ChannelWideContext<T>) {
  if (this.closed) {
    return Promise.resolve();
  }

  this.closed = true;

  for (const handler of this.nextSafeHandlers.splice(0)) {
    handler({ closed: true });
  }
  for (const handler of this.nextUnsafeHandlers.splice(0)) {
    handler.reject(new Error("Channel closed before it got a message"));
  }
  return this.remote ? this.remote.complete() : Promise.resolve();
}

export interface Channel<T> extends Duplex<T, T> {
  take(): Promise<T>;
  tryTake(): Promise<{ closed: true } | { closed: false; value: T }>;
}

interface ChannelWideContext<T> {
  nextSafeHandlers: Array<
    (result: { closed: true } | { closed: false; value: T }) => any
  >;
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
