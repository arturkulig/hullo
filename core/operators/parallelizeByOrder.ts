import { Transducer, IObserver, IObservable, Atom } from "../Observable";
import { Task } from "../Task";

export function parallelizeByOrder<T, U>(
  xf: TrackTransform<T, U>
): OrderedParallel<T, U> {
  return {
    xf,
    start,
    next,
    complete
  };
}

interface TrackTransform<T, U> {
  (value: IObservable<T>): U;
}

interface OrderedParallel<T, U>
  extends Transducer<T[], U[], OrderedParallelContext<T, U>> {
  xf: TrackTransform<T, U>;
}

interface OrderedParallelContext<T, U> {
  xf: TrackTransform<T, U>;
  successive: IObserver<U[]>;
  detail$s: Atom<T>[];
  output: U[];
}

function start<T, U>(
  this: OrderedParallel<T, U>,
  successive: IObserver<U[]>
): OrderedParallelContext<T, U> {
  return {
    successive,
    xf: this.xf,
    detail$s: [],
    output: []
  };
}

function next<T, U>(this: OrderedParallelContext<T, U>, list: T[]) {
  const deliveries: Task<void>[] = [];
  let needsToPushOutput = false;

  for (let i = 0; i < list.length && i < this.output.length; i++) {
    if (this.detail$s[i].valueOf() !== list[i]) {
      const delivery = this.detail$s[i].next(list[i]);
      if (!delivery.done) {
        deliveries.push(delivery);
      }
    }
  }

  for (let i = this.output.length, l = list.length; i < l; i++) {
    needsToPushOutput = true;
    const detail$ = new Atom<T>(list[i]);
    this.detail$s.push(detail$);
    this.output.push(this.xf(detail$));
    const delivery = detail$.next(list[i]);
    if (!delivery.done) {
      deliveries.push(delivery);
    }
  }
  for (let i = list.length, l = this.output.length; i < l; i++) {
    needsToPushOutput = true;
    const delivery = this.detail$s[i].complete();
    if (!delivery.done) {
      deliveries.push(delivery);
    }
  }
  this.detail$s.splice(list.length);
  this.output.splice(list.length);

  if (needsToPushOutput) {
    const delivery = this.successive.next(this.output.slice(0));
    if (!delivery.done) {
      deliveries.push(delivery);
    }
  }

  return deliveries.length ? Task.all(deliveries) : Task.resolved;
}

function complete<T, U>(this: OrderedParallelContext<T, U>) {
  const deliveries: Task<void>[] = [];
  for (let i = 0, l = this.detail$s.length; i < l; i++) {
    const delivery = this.detail$s[i].complete();
    if (!delivery.done) {
      deliveries.push(delivery);
    }
  }
  {
    const delivery = this.successive.complete();
    if (!delivery.done) {
      deliveries.push(delivery);
    }
  }
  return Task.all(deliveries);
}
