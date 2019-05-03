import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer
} from "../observable";
import { Atom } from "../atom";

export function deepMap<T, U>(xf: DeepMapTransform<T, U>) {
  return function deepMapI(source: Observable<T[]>): Observable<U[]> {
    return new Observable<U[]>(new DeepMapProducer<T, U>(xf, source));
  };
}

class DeepMapProducer<T, U> implements ComplexProducer<U[]> {
  constructor(
    private xf: DeepMapTransform<T, U>,
    private source: Observable<T[]>
  ) {}

  subscribe(observer: Observer<U[]>) {
    const context: DeepMapContext<T, U> = {
      observer,
      xf: this.xf,
      source: this.source,
      detail$s: [],
      output: [],
      lastInput: []
    };

    const sub = this.source.subscribe(new DeepMapSourceObserver<T, U>(context));

    return new DeepMapCancel(sub);
  }
}

class DeepMapCancel {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

class DeepMapSourceObserver<T, U> implements Observer<T[]> {
  get closed() {
    return this.context.observer.closed;
  }

  constructor(private context: DeepMapContext<T, U>) {}

  next(list: T[]) {
    const { context } = this;
    const deliveries: Promise<void>[] = [];
    let needsToPushOutput = false;

    for (let i = 0; i < list.length && i < context.output.length; i++) {
      if (context.detail$s[i].unwrap() !== list[i]) {
        const delivery = context.detail$s[i].next(list[i]);
        deliveries.push(delivery);
      }
    }

    for (let i = context.output.length, l = list.length; i < l; i++) {
      needsToPushOutput = true;
      const detail$ = new Atom<T>(list[i]);
      context.detail$s.push(detail$);
      context.output.push(context.xf(detail$, i));
      const delivery = detail$.next(list[i]);
      deliveries.push(delivery);
    }
    for (let i = list.length, l = context.output.length; i < l; i++) {
      needsToPushOutput = true;
      const delivery = context.detail$s[i].complete();
      deliveries.push(delivery);
    }
    context.detail$s.splice(list.length);
    context.output.splice(list.length);

    if (needsToPushOutput && context.observer) {
      const delivery = context.observer.next(context.output.slice(0));
      deliveries.push(delivery);
    }

    return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
  }

  complete() {
    const { context } = this;
    if (!context.observer) {
      return Promise.resolve();
    }
    const deliveries: Promise<void>[] = [];
    for (let i = 0, l = context.detail$s.length; i < l; i++) {
      const delivery = context.detail$s[i].complete();
      deliveries.push(delivery);
    }
    {
      const delivery = context.observer.complete();
      deliveries.push(delivery);
    }
    return Promise.all(deliveries);
  }
}

interface DeepMapTransform<T, U> {
  (value: Atom<T>, i: number): U;
}

interface DeepMapContext<T, U> {
  observer: Observer<U[]>;
  xf: DeepMapTransform<T, U>;
  source: Observable<T[]>;
  detail$s: Atom<T>[];
  lastInput: T[];
  output: U[];
}
