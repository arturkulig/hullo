import { resolved } from "../task";
import { Observable, Observer } from "./observable";

export function filter<I>(predicate: (i: I) => boolean) {
  return function filterI(stream: Observable<I>) {
    return function filterII(observer: Observer<I>) {
      return stream({
        next: function filterII_next(value) {
          return predicate(value) ? observer.next(value) : resolved;
        },
        complete: observer.complete
      });
    };
  };
}
