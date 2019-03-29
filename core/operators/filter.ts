import { Transducer } from "../Observable/Transducer";
import { IObserver } from "../Observable";

export function filter<T>(predicate: Predicate<T>): Filter<T> {
  return {
    predicate,
    start,
    next,
    complete
  };
}

interface Predicate<T> {
  (value: T): boolean;
}

interface Filter<T> extends Transducer<T, T, FilterCtx<T>> {
  predicate: Predicate<T>;
}

interface FilterCtx<T> {
  predicate: Predicate<T>;
  successive: IObserver<T>;
}

function start<T>(this: Filter<T>, successive: IObserver<T>): FilterCtx<T> {
  return {
    successive,
    predicate: this.predicate
  };
}

function next<T>(this: FilterCtx<T>, value: T) {
  return this.predicate(value)
    ? this.successive.next(value)
    : Promise.resolve();
}

function complete<T>(this: FilterCtx<T>) {
  return this.successive.complete();
}
