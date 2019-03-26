import { Transducer } from "../Observable/Transducer";
import { IObserver } from "../Observable";

export function map<T, U>(xf: Transform<T, U>): Map<T, U> {
  return {
    xf,
    start,
    next,
    complete
  };
}

interface Transform<T, U> {
  (value: T): U;
}

interface Map<T, U> extends Transducer<T, U, MapContext<T, U>> {
  xf: Transform<T, U>;
}

interface MapContext<T, U> {
  xf: Transform<T, U>;
  successive: IObserver<U>;
}

function start<T, U>(
  this: Map<T, U>,
  successive: IObserver<U>
): MapContext<T, U> {
  return {
    successive,
    xf: this.xf
  };
}

function next<T, U>(this: MapContext<T, U>, value: T) {
  return this.successive.next(this.xf(value));
}

function complete<T, U>(this: MapContext<T, U>) {
  return this.successive.complete();
}
