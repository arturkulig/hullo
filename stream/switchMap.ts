import { Observable, observable } from "./observable";
import { Cancellation, resolve, resolved } from "../future/task";

export const switchMap = <I, O>(xf: (i: I) => Observable<O>) => (
  outerStream: Observable<I>
) =>
  observable<O>(observer => {
    let inner: null | {
      stream: Observable<O>;
      cancel: Cancellation;
    } = null;

    const cancelOuter = outerStream({
      next: value => {
        const innerStream = xf(value);

        if (inner) {
          if (inner.stream === innerStream) {
            return resolved;
          }
          const { cancel } = inner;
          inner = null;
          cancel();
        }

        const cancelInnerStream = innerStream({
          next: observer.next,
          complete: resolve
        });
        inner = { stream: innerStream, cancel: cancelInnerStream };
        return resolved;
      },
      complete: observer.complete
    });

    return () => {
      cancelOuter();

      if (inner) {
        const { cancel } = inner;
        inner = null;
        cancel();
      }
    };
  });
