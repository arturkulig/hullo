import { Observable, Observer } from "./observable";
import { resolved } from "../future/task";

export function filter<I>(predicate: (i: I) => boolean) {
  return function filter_I(stream: Observable<I>) {
    return function filter_II(observer: Observer<I>) {
      return stream({
        next: function filter_II_next(value) {
          return predicate(value) ? observer.next(value) : resolved;
        },
        complete: observer.complete
      });
    };
  };
}
