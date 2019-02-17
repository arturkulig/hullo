import { Observable, observable } from "./observable";
import { buffer } from "./buffer";
import { Cancellation, resolved } from "../future/task";

export const flatMap = <I, O>(xf: (i: I) => Observable<O>) => (
  outerStream: Observable<I>
) =>
  buffer(
    observable<O>(observer => {
      let activeInnerStreams: Cancellation[] = [];

      const cancelOuter = outerStream({
        next: value => {
          const innerStream = xf(value);
          const cancelInnerStreamSub = innerStream({
            next: observer.next,
            complete: () => {
              activeInnerStreams.splice(
                activeInnerStreams.indexOf(cancelInnerStreamSub),
                1
              );
              return resolved;
            }
          });
          activeInnerStreams.push(cancelInnerStreamSub);
          return resolved;
        },
        complete: observer.complete
      });

      return () => {
        cancelOuter();
        activeInnerStreams.forEach(call);
      };
    })
  );

const call = (f: () => any) => f();
