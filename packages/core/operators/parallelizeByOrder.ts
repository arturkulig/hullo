import {
  IObserver,
  IObservable,
  Atom,
  Observable,
  Subscription
} from "../Observable";

export function parallelizeByOrder<T, U>(xf: TrackTransform<T, U>) {
  return function parallelizeByOrderI(source: IObservable<T[]>) {
    return new Observable<U[]>(parallelizeBOProducer, parallelizeBOContext, {
      xf,
      source
    });
  };
}

interface TrackTransform<T, U> {
  (value: IObservable<T>): U;
}

interface OrderedParallelArg<T, U> {
  xf: TrackTransform<T, U>;
  source: IObservable<T[]>;
}

interface OrderedParallelContext<T, U> {
  observer: IObserver<U[]> | undefined;
  sub: Subscription | undefined;
  xf: TrackTransform<T, U>;
  source: IObservable<T[]>;
  detail$s: Atom<T>[];
  keys: string[];
  lastInput: T[];
  output: U[];
}

function parallelizeBOContext<T, U>(
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

function parallelizeBOProducer<T, U>(
  this: OrderedParallelContext<T, U>,
  observer: IObserver<U[]>
) {
  this.observer = observer;
  this.sub = this.source.subscribe(
    {
      next,
      complete
    },
    this
  );

  return parallelizeBOCancel;
}

function parallelizeBOCancel<T, U>(this: OrderedParallelContext<T, U>) {
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
    const detail$ = new Atom<T>(list[i]);
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
