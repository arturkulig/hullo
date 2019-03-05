import { Observable, Observer } from "./observable";
import { resolved } from "../future/task";
import { buffer } from "./buffer";

export function combineLatest<T extends [...any[]]>(
  streams: { [idx in keyof T]: Observable<T[idx]> }
) {
  return buffer(function combineLatest_I(observer: Observer<T>) {
    let latest: {
      [idx in keyof T]: { ok: false; value: any } | { ok: true; value: T[idx] }
    } = (streams as any).map(() => ({ ok: false })) as any;

    const streamSubCancellations = streams.map(function combineLatest_consume(
      stream,
      i
    ) {
      const streamSubCancel = stream({
        next: function combineLatest_consume_next(value) {
          latest[i].ok = true;
          latest[i].value = value;

          for (const latestEntry of latest) {
            if (!latestEntry.ok) {
              return resolved;
            }
          }

          return observer.next(latest.map(_ => _!.value) as T);
        },
        complete: function combineLatest_consume_complete() {
          for (const cancel of streamSubCancellations.splice(0)) {
            if (cancel !== streamSubCancel) {
              cancel();
            }
          }
          return observer.complete();
        }
      });
      return streamSubCancel;
    });

    return () => {
      for (const cancel of streamSubCancellations.splice(0)) {
        cancel();
      }
    };
  });
}
