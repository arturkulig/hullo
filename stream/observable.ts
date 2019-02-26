import { Task, Cancellation } from "../future/task";
import { resolved } from "../future/task";
import { schedule } from "../future";

export interface Observer<T> {
  next(value: T): Task<any>;
  complete(): Task<any>;
}

export interface Observable<T> {
  (consumer: Observer<T>): Cancellation;
}

export function observable<T>(producer: Observable<T>): Observable<T> {
  return consumer => {
    let closed = false;

    const cancel = producer({
      next: value => (!closed ? consumer.next(value) : resolved),
      complete: () => (!closed ? consumer.complete() : resolved)
    });

    return () => {
      if (closed) {
        return;
      }
      closed = true;
      schedule(cancel);
    };
  };
}
