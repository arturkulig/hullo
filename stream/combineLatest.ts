import { observable, Observable } from "./observable";
import { resolved } from "../future/task";
import { buffer } from "./buffer";

export const combineLatest = <T extends ([...any[]])>(
  streams: { [idx in keyof T]: Observable<T[idx]> }
) =>
  buffer(
    observable<T>(observer => {
      let latest: { [idx in keyof T]: null | { value: T[idx] } } = (streams as any).map(
        () => null
      ) as any;

      const streamSubCancellations = streams.map((stream, i) =>
        stream({
          next: value => {
            latest.splice(i, 1, { value });

            if (!latest.includes(null)) {
              return observer.next(latest.map(_ => _!.value) as T);
            }
            return resolved;
          },
          complete: () => {
            streamSubCancellations.forEach(call);
            return observer.complete();
          }
        })
      );

      return () => {
        streamSubCancellations.forEach(call);
      };
    })
  );

const call = (f: (...args: any[]) => any) => f();
