import { observable, Observable } from "./observable";
import { Cancellation } from "../future/task";
import { future } from "../future/future";
import { schedule } from "../future/schedule";

enum BuffedType {
  next,
  complete
}
type Buffed<T> =
  | {
      type: BuffedType.next;
      value: T;
      ack: (...args: any[]) => void;
      cancel: null | Cancellation;
    }
  | {
      type: BuffedType.complete;
      ack: (...args: any[]) => void;
      cancel: null | Cancellation;
    };

export function buffer<T>(origin: Observable<T>): Observable<T> {
  return observable<T>(observer => {
    let cancelCurrentDispatch: null | Cancellation = null;
    const buff = Array<Buffed<T>>();

    const run = () => {
      if (!cancelCurrentDispatch && buff.length) {
        const oldEntry = buff.shift()!;
        const oldEntrySending =
          oldEntry.type === BuffedType.next
            ? observer.next(oldEntry.value)
            : observer.complete();
        const cancel = oldEntrySending(() => {
          if (cancelCurrentDispatch) {
            const c = cancelCurrentDispatch;
            cancelCurrentDispatch = null;
            c();
          }
          schedule(run);
          oldEntry.ack();
        });
        cancelCurrentDispatch = cancel;
        oldEntry.cancel = cancel;
      }
    };

    const push = (
      msg: { type: BuffedType.next; value: T } | { type: BuffedType.complete }
    ) => {
      return future(resolve => {
        const newEntry: Buffed<T> = { ...msg, ack: resolve, cancel: null };
        buff.push(newEntry);

        schedule(run);

        return () => {
          if (buff.includes(newEntry)) {
            buff.splice(buff.indexOf(newEntry), 1);
          }
          if (newEntry.cancel) {
            newEntry.cancel();
            schedule(run);
          }
        };
      });
    };

    const unsub = origin({
      next: value => push({ type: BuffedType.next, value }),
      complete: () => push({ type: BuffedType.complete })
    });

    return unsub;
  });
}
