import {
  Subscription,
  Observable,
  Observer,
  ComplexProducer
} from "../Observable";
import { Atom } from "../Atom";

export function deepMapByKey<T, U>(
  xf: DeepMapByKeyTransform<T, U>,
  identity: DeepMapByKeyIndentity<T>
) {
  return function deepMapByKeyI(source: Observable<T[]>): Observable<U[]> {
    return new Observable<U[]>(
      new DeepMapByKeyProducer<T, U>(xf, identity, source)
    );
  };
}

class DeepMapByKeyProducer<T, U> implements ComplexProducer<U[]> {
  constructor(
    private xf: DeepMapByKeyTransform<T, U>,
    private identity: DeepMapByKeyIndentity<T>,
    private source: Observable<T[]>
  ) {}

  subscribe(observer: Observer<U[]>) {
    const context: DeepMapByKeyContext<T, U> = {
      observer,
      xf: this.xf,
      source: this.source,
      identity: this.identity,
      detail$s: [],
      output: [],
      lastInput: [],
      keys: []
    };

    const sub = this.source.subscribe(
      new DeepMapByKeySourceObserver<T, U>(context)
    );

    return new DeepMapByKeyCancel(sub);
  }
}

class DeepMapByKeyCancel {
  constructor(private sub: Subscription) {}

  cancel() {
    if (!this.sub.closed) {
      this.sub.cancel();
    }
  }
}

class DeepMapByKeySourceObserver<T, U> implements Observer<T[]> {
  get closed() {
    return this.context.observer.closed;
  }

  constructor(private context: DeepMapByKeyContext<T, U>) {}

  next(list: T[]) {
    const { context } = this;
    const nextDetail$s: Atom<T>[] = context.detail$s.slice(0, list.length);
    const nextKeys: string[] = context.keys.slice(0, list.length);
    const nextOutput: U[] = context.output.slice(0, list.length);
    const deliveries: Promise<any>[] = [];
    let itemsMoved = 0;
    let itemsCreated = 0;
    let itemsRemoved = 0;

    for (let i = 0; i < list.length; i++) {
      const key = context.identity(list[i]);
      const prevPos = context.keys.indexOf(key);

      if (prevPos >= 0) {
        if (prevPos !== i) {
          nextDetail$s[i] = context.detail$s[prevPos];
          nextKeys[i] = context.keys[prevPos];
          nextOutput[i] = context.output[prevPos];
          itemsMoved++;
        }
        if (context.lastInput[prevPos] !== list[i]) {
          const delivery = nextDetail$s[i].next(list[i]);
          deliveries.push(delivery);
        }
      } else {
        itemsCreated++;
        const detail$ = new Atom<T>(list[i]);
        const key = context.identity(list[i]);
        const newOutputEntry = context.xf(detail$, key);
        nextKeys[i] = key;
        nextDetail$s[i] = detail$;
        nextOutput[i] = newOutputEntry;
        const delivery = detail$.next(list[i]);
        deliveries.push(delivery);
      }
    }

    if (list.length - itemsCreated - context.lastInput.length < 0)
      for (let i = 0, l = context.keys.length; i < l; i++) {
        if (nextKeys.indexOf(context.keys[i]) < 0) {
          itemsRemoved++;
          const delivery = context.detail$s[i].complete();
          deliveries.push(delivery);
        }
      }

    if (context.observer && (itemsMoved || itemsCreated || itemsRemoved)) {
      const delivery = context.observer.next(nextOutput.slice(0));
      deliveries.push(delivery);
    }

    context.detail$s = nextDetail$s;
    context.keys = nextKeys;
    context.output = nextOutput;
    context.lastInput = list;

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

interface DeepMapByKeyTransform<T, U> {
  (value: Atom<T>, key: string): U;
}

interface DeepMapByKeyIndentity<T> {
  (value: T): string;
}

interface DeepMapByKeyContext<T, U> {
  observer: Observer<U[]>;
  xf: DeepMapByKeyTransform<T, U>;
  identity: DeepMapByKeyIndentity<T>;
  source: Observable<T[]>;
  detail$s: Atom<T>[];
  keys: string[];
  lastInput: T[];
  output: U[];
}
