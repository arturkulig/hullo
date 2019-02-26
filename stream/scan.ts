import { Observable, Observer } from "./observable";

export function scan<I, R>(
  accumulator: (result: R, item: I, ordinal: number) => R,
  initial: R
) {
  return function scan_I(stream: Observable<I>) {
    let ordinal = 0;
    let result: R = initial;

    return function scan_II(observer: Observer<R>) {
      return stream({
        next: function scan_next(item) {
          return observer.next((result = accumulator(result, item, ordinal)));
        },
        complete: observer.complete
      });
    };
  };
}
