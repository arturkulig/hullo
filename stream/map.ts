import { Observable, Observer } from "./observable";

export function map<I, O>(xf: (i: I) => O) {
  return function map_op(stream: Observable<I>) {
    return function map_observable(observer: Observer<O>) {
      return stream({
        next: value => observer.next(xf(value)),
        complete: observer.complete
      });
    };
  };
}
