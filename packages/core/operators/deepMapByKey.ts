import { Subscription, Observable, Observer, observable } from "../observable";
import { Atom, atom } from "../atom";

export function deepMapByKey<T, U>(
  xf: TrackTransform<T, U>,
  identity: TrackIdentity<T>
) {
  return function deepMapByKeyI(source: Observable<T[]>): Observable<U[]> {
    return observable<U[], KeyedParallelContext<T, U>, KeyedParallelArg<T, U>>(
      deepMapByKeyProducer,
      deepMapByKeyContext,
      {
        xf,
        identity,
        source
      }
    );
  };
}

function deepMapByKeyContext<T, U>(
  arg: KeyedParallelArg<T, U>
): KeyedParallelContext<T, U> {
  return {
    observer: undefined,
    sub: undefined,
    xf: arg.xf,
    source: arg.source,
    identity: arg.identity,
    detail$s: [],
    output: [],
    lastInput: [],
    keys: []
  };
}

function deepMapByKeyProducer<T, U>(
  this: KeyedParallelContext<T, U>,
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

  return deepMapByKeyCancel;
}

function deepMapByKeyCancel<T, U>(this: KeyedParallelContext<T, U>) {
  if (this.sub && !this.sub.closed) {
    this.sub.cancel();
  }
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
      const detail$ = atom<T>(list[i]);
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

  if (this.observer && (itemsMoved || itemsCreated || itemsRemoved)) {
    const delivery = this.observer.next(nextOutput.slice(0));
    deliveries.push(delivery);
  }

  this.detail$s = nextDetail$s;
  this.keys = nextKeys;
  this.output = nextOutput;
  this.lastInput = list;

  return deliveries.length ? Promise.all(deliveries) : Promise.resolve();
}

function complete<T, U>(this: KeyedParallelContext<T, U>) {
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

interface TrackIdentity<T> {
  (value: T): string;
}

interface KeyedParallelArg<T, U> {
  xf: TrackTransform<T, U>;
  identity: TrackIdentity<T>;
  source: Observable<T[]>;
}

interface KeyedParallelContext<T, U> {
  observer: Observer<U[]> | undefined;
  sub: Subscription | undefined;
  xf: TrackTransform<T, U>;
  identity: TrackIdentity<T>;
  source: Observable<T[]>;
  detail$s: Atom<T>[];
  keys: string[];
  lastInput: T[];
  output: U[];
}
