import { Transducer, IObserver, IObservable, Atom } from "../Observable";
import { Task } from "../Task";

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
    keys: []
  };
}

function next<T, U>(this: KeyedParallelContext<T, U>, list: T[]) {
  const nextDetail$s: Atom<T>[] = [];
  const nextKeys: string[] = [];
  const nextOutput: U[] = [];
  const deliveries: Task<any>[] = [];
  let needsToPushOutput = false;

  for (let i = 0; i < list.length; i++) {
    const key = this.identity(list[i]);
    const prevPos = this.keys.indexOf(key);

    if (prevPos >= 0) {
      nextDetail$s[i] = this.detail$s[prevPos];
      nextKeys[i] = this.keys[prevPos];
      nextOutput[i] = this.output[prevPos];

      if (prevPos !== i) {
        needsToPushOutput = true;
      }
      if (nextDetail$s[i].valueOf() !== list[i]) {
        const delivery = nextDetail$s[i].next(list[i]);
        if (delivery !== Task.resolved) {
          deliveries.push(delivery);
        }
      }
    } else {
      needsToPushOutput = true;
      const detail$ = new Atom<T>(list[i]);
      const newOutputEntry = this.xf(detail$);
      nextKeys[i] = this.identity(list[i]);
      nextDetail$s[i] = detail$;
      nextOutput[i] = newOutputEntry;
      const delivery = detail$.next(list[i]);
      if (delivery !== Task.resolved) {
        deliveries.push(delivery);
      }
    }
  }

  for (let i = 0, l = this.keys.length; i < l; i++) {
    if (nextKeys.indexOf(this.keys[i]) < 0) {
      needsToPushOutput = true;
      const delivery = this.detail$s[i].complete();
      if (delivery !== Task.resolved) {
        deliveries.push(delivery);
      }
    }
  }

  if (needsToPushOutput) {
    const delivery = this.successive.next(nextOutput.slice(0));
    if (delivery !== Task.resolved) {
      deliveries.push(delivery);
    }
  }

  this.detail$s = nextDetail$s;
  this.keys = nextKeys;
  this.output = nextOutput;

  return deliveries.length ? Task.all(deliveries) : Task.resolved;
}

function complete<T, U>(this: KeyedParallelContext<T, U>) {
  const deliveries: Task<void>[] = [];
  for (let i = 0, l = this.detail$s.length; i < l; i++) {
    const delivery = this.detail$s[i].complete();
    if (delivery !== Task.resolved) {
      deliveries.push(delivery);
    }
  }
  {
    const delivery = this.successive.complete();
    if (delivery !== Task.resolved) {
      deliveries.push(delivery);
    }
  }
  return Task.all(deliveries);
}
