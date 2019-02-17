import { Observable, observable } from "./observable";

export const map = <I, O>(xf: (i: I) => O) => (stream: Observable<I>) =>
  observable<O>(observer =>
    stream({
      next: value => observer.next(xf(value)),
      complete: observer.complete
    })
  );
