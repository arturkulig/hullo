import { subscribe, observable, queue } from "../core";

export function combineLatest<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>,
    AsyncIterable<T5>,
    AsyncIterable<T6>,
    AsyncIterable<T7>,
    AsyncIterable<T8>,
    AsyncIterable<T9>
  ]
): AsyncIterable<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;

export function combineLatest<T1, T2, T3, T4, T5, T6, T7, T8>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>,
    AsyncIterable<T5>,
    AsyncIterable<T6>,
    AsyncIterable<T7>,
    AsyncIterable<T8>
  ]
): AsyncIterable<[T1, T2, T3, T4, T5, T6, T7, T8]>;

export function combineLatest<T1, T2, T3, T4, T5, T6, T7>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>,
    AsyncIterable<T5>,
    AsyncIterable<T6>,
    AsyncIterable<T7>
  ]
): AsyncIterable<[T1, T2, T3, T4, T5, T6, T7]>;

export function combineLatest<T1, T2, T3, T4, T5, T6>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>,
    AsyncIterable<T5>,
    AsyncIterable<T6>
  ]
): AsyncIterable<[T1, T2, T3, T4, T5, T6]>;

export function combineLatest<T1, T2, T3, T4, T5>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>,
    AsyncIterable<T5>
  ]
): AsyncIterable<[T1, T2, T3, T4, T5]>;

export function combineLatest<T1, T2, T3, T4>(
  streams: [
    AsyncIterable<T1>,
    AsyncIterable<T2>,
    AsyncIterable<T3>,
    AsyncIterable<T4>
  ]
): AsyncIterable<[T1, T2, T3, T4]>;

export function combineLatest<T1, T2, T3>(
  streams: [AsyncIterable<T1>, AsyncIterable<T2>, AsyncIterable<T3>]
): AsyncIterable<[T1, T2, T3]>;

export function combineLatest<T1, T2>(
  streams: [AsyncIterable<T1>, AsyncIterable<T2>]
): AsyncIterable<[T1, T2]>;

export function combineLatest<T1>(
  streams: [AsyncIterable<T1>]
): AsyncIterable<[T1]>;

export function combineLatest<T>(
  streams: AsyncIterable<T>[]
): AsyncIterable<T[]>;

export function combineLatest<T>(
  streams: AsyncIterable<T>[]
): AsyncIterable<T[]> {
  return observable<T[]>(
    queue(observer => {
      let last = new Array<T>(streams.length);

      let presentAll = false;
      const presentList = streams.map(() => false);

      const subs = streams.map((stream, idx) =>
        subscribe(stream, {
          next(value: T) {
            const next = [...last];
            next[idx] = value;
            last = next;
            if (!presentAll) {
              presentList[idx] = true;
              presentAll = true;
              for (const present of presentList) {
                if (!present) {
                  presentAll = false;
                }
              }
            }
            if (presentAll) {
              return observer.next(next);
            }
          },
          error: observer.error,
          complete: observer.complete
        })
      );
      return () => {
        for (const sub of subs) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
      };
    })
  );
}
