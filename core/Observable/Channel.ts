import { Duplex } from "./Duplex";
import { IObserver, Observable } from "./Observable";
import { Subject } from "./Subject";

interface ChannelWideContext<T> {
  remote: IObserver<T> | undefined;
}

interface ChannelContext<T> {
  wide: ChannelWideContext<T>;
  observer: IObserver<T> | undefined;
}

export class Channel<T> extends Duplex<T, T, IObserver<T>> {
  constructor() {
    const wide: ChannelWideContext<T> = { remote: undefined };
    const observable = new Subject<T>(
      new Observable<T, ChannelContext<T>, ChannelWideContext<T>>(
        channelProduce,
        channelContext,
        wide
      )
    );
    const observer = new ChannelObserver(wide);
    super(observable, observer);
  }
}

function channelContext<T>(arg: ChannelWideContext<T>): ChannelContext<T> {
  return { wide: arg, observer: undefined };
}

function channelProduce<T>(this: ChannelContext<T>, observer: IObserver<T>) {
  this.wide.remote = observer;

  return channelCancel;
}

function channelCancel<T>(this: ChannelContext<T>) {
  this.wide.remote = undefined;
}

class ChannelObserver<T> implements IObserver<T, ChannelObserver<T>> {
  constructor(private _wide: ChannelWideContext<T>) {}

  next(value: T) {
    return this._wide.remote
      ? this._wide.remote.next(value)
      : Promise.resolve();
  }

  complete() {
    return this._wide.remote ? this._wide.remote.complete() : Promise.resolve();
  }
}
