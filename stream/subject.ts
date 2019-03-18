import { Cancellation, all, Task } from "../task";
import { Observable, Observer } from "./observable";

export function subject<T>(origin: Observable<T>): Observable<T> {
  const leeches: Observer<T>[] = [];
  let cancel: null | Cancellation = null;

  return function subject_observable(observer: Observer<T>) {
    leeches.push(observer);

    if (!cancel) {
      cancel = origin({
        next: function subject_observable_next(value) {
          // does not Array::map as subscribers
          // can be added and/or removed during iteration
          const deliveries: Task<any>[] = [];
          for (const leech of leeches) {
            deliveries.push(leech.next(value));
          }
          return all(deliveries);
        },
        complete: function subject_observable_complete() {
          // does not Array::map as subscribers
          // can be added and/or removed during iteration
          const deliveries: Task<any>[] = [];
          for (const leech of leeches) {
            deliveries.push(leech.complete());
          }
          return all(deliveries);
        }
      });
    }

    return function subject_observable_cancel() {
      const pos = leeches.indexOf(observer);
      if (pos >= 0) {
        leeches.splice(pos, 1);

        if (leeches.length === 0 && cancel) {
          const c = cancel;
          cancel = null;
          c();
        }
      }
    };
  };
}
