import { Subscription, Observable, observable, Observer } from "../observable";
import { Atom, atom } from "../atom";

export function deepMap<T, U>(xf: TrackTransform<T, U>) {
  return function deepMapI(source: Observable<T[]>): Observable<U[]> {
    return observable<
      U[],
      OrderedParallelContext<T, U>,
      OrderedParallelArg<T, U>
    >(deepMapProducer, deepMapContext, {
      xf,
      source
    });
  };
}

function deepMapContext<T, U>(
  arg: OrderedParallelArg<T, U>
): OrderedParallelContext<T, U> {
  return {
    observer: undefined,
    sub: undefined,
    xf: arg.xf,
    source: arg.source,
    detail$s: [],
    output: [],
    lastInput: [],
    keys: []
  };
}

function deepMapProducer<T, U>(
  this: OrderedParallelContext<T, U>,
  observer: Observer<U[]>
) {
  this.observer = observer;
  this.sub = this.source.subscribe(
    {
      next,
      complete
    },
    this
  );

  return deepMapCancel;
}

function deepMapCancel<T, U>(this: OrderedParallelContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
}

function next<T, U>(this: OrderedParallelContext<T, U>, list: T[]) {
  const deliveries: Promise<void>[] = [];
  let needsToPushOutput = false;

  for (let i = 0; i < list.length && i < this.output.length; i++) {
    if (this.detail$s[i].valueOf() !== list[i]) {
      const delivery = this.detail$s[i].next(list[i]);
      deliveries.push(delivery);
    }
  }

  for (let i = this.output.length, l = list.length; i < l; i++) {
    needsToPushOutput = true;
    const detail$ = atom<T>(list[i]);
    this.detail$s.push(detail$);
    this.output.push(this.xf(detail$));
    const delivery = detail$.next(list[i]);
    deliveries.push(delivery);
  }
  for (let i = list.length, l = this.output.length; i < l; i++) {
    needsToPushOutput = true;
    const delivery = this.detail$s[i].complete();
    deliveries.push(delivery);
  }
  this.detail$s.splice(list.length);
  this.output.splice(list.length);

  if (needsToPushOutput && this.observer) {
    const delivery = this.observer.next(this.output.slice(0));
    deliveries.push(delivery);
  }

  return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
}

function complete<T, U>(this: OrderedParallelContext<T, U>) {
  if (!this.observer) {
    return;
  }
  const deliveries: Promise<void>[] = [];
  for (let i = 0, l = this.detail$s.length; i < l; i++) {
    const delivery = this.detail$s[i].complete();
    deliveries.push(delivery);
  }
  {
    const delivery = this.observer.complete();
    deliveries.push(delivery);
  }
  return Promise.all(deliveries);
}

interface TrackTransform<T, U> {
  (value: Observable<T>): U;
}

interface OrderedParallelArg<T, U> {
  xf: TrackTransform<T, U>;
  source: Observable<T[]>;
}

interface OrderedParallelContext<T, U> {
  observer: Observer<U[]> | undefined;
  sub: Subscription | undefined;
  xf: TrackTransform<T, U>;
  source: Observable<T[]>;
  detail$s: Atom<T>[];
  keys: string[];
  lastInput: T[];
  output: U[];
}
