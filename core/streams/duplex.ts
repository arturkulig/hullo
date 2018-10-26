import { AsyncObserver } from "./observableTypes";

export interface Duplex<OFOBSERVER, OFOBSERVABLE>
  extends AsyncIterable<OFOBSERVABLE>,
    AsyncObserver<OFOBSERVER> {}

export function duplex<OFOBSERVER, OFOBSERVABLE>(
  outgoing: AsyncObserver<OFOBSERVER>,
  incoming: AsyncIterable<OFOBSERVABLE>
): Duplex<OFOBSERVER, OFOBSERVABLE> {
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
