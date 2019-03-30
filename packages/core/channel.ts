import { Duplex, duplex } from "./duplex";
import { Observer, observable } from "./observable";
import { subject } from "./operators/subject";

export function channel<T>(): Channel<T> {
  const wide: ChannelWideContext<T> = { remote: undefined };
  const o = observable<T, ChannelContext<T>, ChannelWideContext<T>>(
    channelProduce,
    channelContext,
    wide
  ).pipe(subject);
  const observer = observerForChannel(wide);
  return duplex(o, observer);
}

function channelContext<T>(arg: ChannelWideContext<T>): ChannelContext<T> {
  return { wide: arg, observer: undefined };
}

function channelProduce<T>(this: ChannelContext<T>, observer: Observer<T>) {
  this.wide.remote = observer;

  return channelCancel;
}

function channelCancel<T>(this: ChannelContext<T>) {
  this.wide.remote = undefined;
}

function observerForChannel<T>(_wide: ChannelWideContext<T>): Observer<T> {
  const o: ChannelObserver<T> = {
    _wide,
    next,
    complete
  };
  return o;
}

function next<T>(this: ChannelObserver<T>, value: T) {
  return this._wide.remote ? this._wide.remote.next(value) : Promise.resolve();
}

function complete<T>(this: ChannelObserver<T>) {
  return this._wide.remote ? this._wide.remote.complete() : Promise.resolve();
}

export interface Channel<T> extends Duplex<T, T> {}

interface ChannelObserver<T> extends Observer<T> {
  _wide: ChannelWideContext<T>;
}

interface ChannelWideContext<T> {
  remote: Observer<T> | undefined;
}

interface ChannelContext<T> {
  wide: ChannelWideContext<T>;
  observer: Observer<T> | undefined;
}
