import { Cancellation, resolved } from "../task";
import { Observable, Observer } from "./observable";
import { buffer } from "./buffer";

export function flatMap<I, O>(xf: (i: I) => Observable<O>) {
  return function flatMapI(outerStream: Observable<I>) {
    return buffer(function flatMapI_op(observer: Observer<O>) {
      let closed = false;
      let activeInnerStreams: Cancellation[] = [];

      const cancelOuter = outerStream({
        next: function flatMapI_outer_next(value) {
          const innerStream = xf(value);
          const cancelInnerStreamSub = innerStream({
            next: observer.next,
            complete: function flatMapI_inner_complete() {
              activeInnerStreams.splice(
                activeInnerStreams.indexOf(cancelInnerStreamSub),
                1
              );
              if (closed && activeInnerStreams.length === 0) {
                return observer.complete();
              }
              return resolved;
            }
          });
          activeInnerStreams.push(cancelInnerStreamSub);
          return resolved;
        },
        complete: function flatMapI_outer_complete() {
          closed = true;
          if (activeInnerStreams.length === 0) {
            return observer.complete();
          }
          return resolved;
        }
      });

      return function flatMapI_op_cancel() {
        cancelOuter();
        activeInnerStreams.forEach(call);
      };
    });
  };
}

const call = (f: () => any) => f();
