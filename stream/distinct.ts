import { Observable, Observer } from "./observable";
import { resolved } from "../task";

export function distinct<I>(isDifferent?: (prev: I, next: I) => boolean) {
  return isDifferent
    ? function distinct_Ia(source: Observable<I>) {
        return function distinct_IaI(observer: Observer<I>) {
          let emitted = false;
          let last: null | I = null;
          return source({
            next: function distinct_F_next(value) {
              if (!emitted || isDifferent(last!, value)) {
                last = value;
                emitted = true;
                return observer.next(value);
              } else {
                return resolved;
              }
            },
            complete: observer.complete
          });
        };
      }
    : distinctStrictEqual;
}

export function distinctStrictEqual<I>(source: Observable<I>) {
  return function distinctStrictEqualI(observer: Observer<I>) {
    let emitted = false;
    let last: null | I = null;
    return source({
      next: function distinct_EQ_next(value) {
        if (!emitted || last !== value) {
          last = value;
          emitted = true;
          return observer.next(value);
        } else {
          return resolved;
        }
      },
      complete: observer.complete
    });
  };
}

export function distinctEqual<I>(source: Observable<I>) {
  return function distinctEqualI(observer: Observer<I>) {
    let emitted = false;
    let last: null | I = null;
    return source({
      next: function distinctEqualI_next(value) {
        if (!emitted || last != value) {
          last = value;
          emitted = true;
          return observer.next(value);
        } else {
          return resolved;
        }
      },
      complete: observer.complete
    });
  };
}
