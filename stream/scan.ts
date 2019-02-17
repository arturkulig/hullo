import { observable, Observable } from "./observable";

export const scan = <I, R>(
  accumulator: (result: R, item: I, ordinal: number) => R,
  initial: R
) => (stream: Observable<I>) => {
  let ordinal = 0;
  let result: R = initial;

  return observable<R>(observer =>
    stream({
      next(item) {
        result = accumulator(result, item, ordinal);
        return observer.next(result);
      },
      complete: observer.complete
    })
  );
};
