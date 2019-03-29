import { Transducer } from "../Observable/Transducer";
import { IObserver } from "../Observable";

export function distinct<T>(predicate: Comparator<T>): Distinct<T> {
  return {
    predicate,
    start,
    next,
    complete
  };
}

export function distinctEqual<T>(): Distinct<T> {
  return _distinctEqual;
}

const _distinctEqual = {
  predicate: equal,
  start,
  next,
  complete
};

function equal<T>(v1: T, v2: T): boolean {
  return v1 != v2;
}

export function distinctStrictEqual<T>(): Distinct<T> {
  return _distinctStrictEqual;
}

const _distinctStrictEqual = {
  predicate: strictEqual,
  start,
  next,
  complete
};

function strictEqual<T>(v1: T, v2: T): boolean {
  return v1 !== v2;
}

interface Comparator<T> {
  (value: T, prev: T): boolean;
}

interface Distinct<T> extends Transducer<T, T, DistinctCtx<T>> {
  predicate: Comparator<T>;
}

interface DistinctCtx<T> {
  last?: T;
  predicate: Comparator<T>;
  successive: IObserver<T>;
}

function start<T>(this: Distinct<T>, successive: IObserver<T>): DistinctCtx<T> {
  return {
    successive,
    predicate: this.predicate
  };
}

function next<T>(this: DistinctCtx<T>, value: T) {
  if ("last" in this && !this.predicate(value, this.last!)) {
    return Promise.resolve();
  }
  this.last = value;
  return this.successive.next(value);
}

function complete<T>(this: DistinctCtx<T>) {
  return this.successive.complete();
}
