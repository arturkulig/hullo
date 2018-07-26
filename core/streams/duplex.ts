import { AsyncObserver } from "./observableTypes";

export interface Duplex<OUT, IN>
  extends AsyncIterable<IN>,
    AsyncObserver<OUT> {}

export function duplex<OUT, IN>(
  in$: AsyncObserver<OUT>,
  out$: AsyncIterable<IN>
): Duplex<OUT, IN> {
  return {
    [Symbol.asyncIterator]: out$[Symbol.asyncIterator],
    get closed() {
      return in$.closed;
    },
    next: in$.next,
    error: in$.error,
    complete: in$.complete
  };
}
