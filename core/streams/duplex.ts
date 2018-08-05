import { AsyncObserver } from "./observableTypes";

export interface Duplex<OUT, IN>
  extends AsyncIterable<IN>,
  AsyncObserver<OUT> { }

export function duplex<OUT, IN>(
  outgoing: AsyncObserver<OUT>,
  incoming: AsyncIterable<IN>
): Duplex<OUT, IN> {
  return {
    [Symbol.asyncIterator]: incoming[Symbol.asyncIterator],
    get closed() {
      return outgoing.closed;
    },
    next: outgoing.next,
    error: outgoing.error,
    complete: outgoing.complete
  };
}
