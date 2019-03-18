import { Task, Cancellation, resolved, resolve } from "../task";

export interface Observer<T> {
  next(value: T): Task<any>;
  complete(): Task<any>;
}

export interface Observable<T> {
  (observer: Observer<T>): Cancellation;
}

export function observable<T>(producer: Observable<T>): Observable<T> {
  return function observableI(observer: Observer<T>) {
    let cancelled = false;

    const cancel = producer({
      next:
        observer.next === resolve
          ? resolve
          : function observableI_next(value) {
              return !cancelled ? observer.next(value) : resolved;
            },
      complete:
        observer.complete === resolve
          ? resolve
          : function observableI_complete() {
              return !cancelled ? observer.complete() : resolved;
            }
    });

    return function observable_cancel() {
      if (cancelled) {
        return;
      }
      cancelled = true;
      cancel();
    };
  };
}
