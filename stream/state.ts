import { resolved, Cancellation } from "../task";
import { Observable, Observer } from "./observable";
import { buffer } from "./buffer";
import { subject } from "./subject";

export function state<T>(init: T) {
  return function state_op(
    source: Observable<T>
  ): Observable<T> & {
    valueOf(): T;
  } {
    const state: { closed: boolean; value: T } = { closed: false, value: init };
    let outerCancel: Cancellation | null = null;
    // let remoteObserver: Observer<T> | null = null;

    return Object.assign(
      subject(
        buffer(function state_observable(observer: Observer<T>) {
          if (!outerCancel) {
            outerCancel = source({
              next: function state_next(v: T) {
                state.value = v;
                return observer ? observer.next(v) : resolved;
              },
              complete: function state_complete() {
                state.closed = true;
                return observer ? observer.complete() : resolved;
              }
            });
          }

          if (state.closed) {
            observer.complete();
          } else {
            observer = observer;
            if ("value" in state) {
              observer.next(state.value!);
            }
          }
          return function stateI_cancel() {
            if (outerCancel) {
              const cancel = outerCancel;
              outerCancel = null;
              cancel();
            }
          };
        })
      ),
      {
        valueOf: state_valueOf
      }
    );

    function state_valueOf() {
      return state.value;
    }
  };
}
