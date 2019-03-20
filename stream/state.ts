import { resolved, Cancellation, Task, all } from "../task";
import { Observable, Observer } from "./observable";
import { buffer } from "./buffer";

export function state<T>(init: T) {
  return function state_op(
    source: Observable<T>
  ): Observable<T> & {
    valueOf(): T;
  } {
    const leeches: Observer<T>[] = [];
    let closed = false;
    let value = init;
    let outerCancel: Cancellation | null = source({
      next: state_next,
      complete: state_complete
    });

    return Object.assign(
      buffer(function state_observable(observer: Observer<T>) {
        leeches.push(observer);
        if (closed) {
          observer.complete();
        } else {
          observer.next(value);
        }

        return function stateI_cancel() {
          const pos = leeches.indexOf(observer);
          if (pos >= 0) {
            leeches.splice(pos);
            if (leeches.length === 0 && outerCancel) {
              const cancel = outerCancel;
              outerCancel = null;
              cancel();
            }
          }
        };
      }),
      {
        valueOf: state_valueOf
      }
    );

    function state_valueOf() {
      return value;
    }

    function state_next(v: T) {
      value = v;
      const deliveries: Task<any>[] = [];
      for (const leech of leeches) {
        const delivery = leech.next(v);
        if (delivery !== resolved) {
          deliveries.push(delivery);
        }
      }
      return deliveries.length ? all(deliveries) : resolved;
    }

    function state_complete() {
      closed = true;
      const deliveries: Task<any>[] = [];
      for (const leech of leeches) {
        const delivery = leech.complete();
        if (delivery !== resolved) {
          deliveries.push(delivery);
        }
      }
      return deliveries.length ? all(deliveries) : resolved;
    }
  };
}
