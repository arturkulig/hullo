import { Transducer, IObserver, IObservable, Atom } from "../Observable";

export function parallelizeByKey<T, U>(
  xf: TrackTransform<T, U>,
  identity: TrackIdentity<T>
): KeyedParallel<T, U> {
  return {
    xf,
    identity,
    start,
    next,
    complete
  };
}

interface TrackTransform<T, U> {
  (value: IObservable<T>): U;
}

interface TrackIdentity<T> {
  (value: T): string;
}

interface KeyedParallel<T, U>
  extends Transducer<T[], U[], KeyedParallelContext<T, U>> {
  xf: TrackTransform<T, U>;
  identity: TrackIdentity<T>;
}

interface KeyedParallelContext<T, U> {
  xf: TrackTransform<T, U>;
  identity: TrackIdentity<T>;
  successive: IObserver<U[]>;
  detail$s: Atom<T>[];
  keys: string[];
  lastInput: T[];
  output: U[];
}

function start<T, U>(
  this: KeyedParallel<T, U>,
  successive: IObserver<U[]>
): KeyedParallelContext<T, U> {
  return {
    successive,
    xf: this.xf,
    identity: this.identity,
    detail$s: [],
    output: [],
    lastInput: [],
    keys: []
  };
}

function next<T, U>(this: KeyedParallelContext<T, U>, list: T[]) {
  const nextDetail$s: Atom<T>[] = this.detail$s.slice(0, list.length);
  const nextKeys: string[] = this.keys.slice(0, list.length);
  const nextOutput: U[] = this.output.slice(0, list.length);
  const deliveries: Promise<any>[] = [];
  let itemsMoved = 0;
  let itemsCreated = 0;
  let itemsRemoved = 0;

  for (let i = 0; i < list.length; i++) {
    const key = this.identity(list[i]);
    const prevPos = this.keys.indexOf(key);

    if (prevPos >= 0) {
      if (prevPos !== i) {
        nextDetail$s[i] = this.detail$s[prevPos];
        nextKeys[i] = this.keys[prevPos];
        nextOutput[i] = this.output[prevPos];
        itemsMoved++;
      }
      if (this.lastInput[prevPos] !== list[i]) {
        const delivery = nextDetail$s[i].next(list[i]);
        deliveries.push(delivery);
      }
    } else {
      itemsCreated++;
      const detail$ = new Atom<T>(list[i]);
      const newOutputEntry = this.xf(detail$);
      nextKeys[i] = this.identity(list[i]);
      nextDetail$s[i] = detail$;
      nextOutput[i] = newOutputEntry;
      const delivery = detail$.next(list[i]);
      deliveries.push(delivery);
    }
  }

  if (list.length - itemsCreated - this.lastInput.length < 0)
    for (let i = 0, l = this.keys.length; i < l; i++) {
      if (nextKeys.indexOf(this.keys[i]) < 0) {
        itemsRemoved++;
        const delivery = this.detail$s[i].complete();
        deliveries.push(delivery);
      }
    }

  if (itemsMoved || itemsCreated || itemsRemoved) {
    const delivery = this.successive.next(nextOutput.slice(0));
    deliveries.push(delivery);
  }

  this.detail$s = nextDetail$s;
  this.keys = nextKeys;
  this.output = nextOutput;
  this.lastInput = list;

  return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
}

function complete<T, U>(this: KeyedParallelContext<T, U>) {
  const deliveries: Promise<void>[] = [];
  for (let i = 0, l = this.detail$s.length; i < l; i++) {
    const delivery = this.detail$s[i].complete();
    deliveries.push(delivery);
  }
  {
    const delivery = this.successive.complete();
    deliveries.push(delivery);
  }
  return Promise.all(deliveries);
}
