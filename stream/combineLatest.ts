import { resolved, then2, commit } from "../task";
import { pipe } from "../pipe";
import { Observable, Observer } from "./observable";
import { buffer } from "./buffer";

export function combineLatest<T extends [...any[]]>(
  streams: { [idx in keyof T]: Observable<T[idx]> }
) {
  return buffer(function combineLatest_I(observer: Observer<T>) {
    if (streams.length === 0) {
      return pipe(
        ([] as any[]) as T,
        observer.next,
        then2(observer.complete),
        commit
      );
    }

    if (streams.length === 1) {
      return streams[0]({
        next: function combineLatest_1_next(v: T[0]) {
          return observer.next([v] as T);
        },
        complete: observer.complete
      });
    }

    let oks = false;
    let latest: {
      [idx in keyof T]: { ok: false; value: any } | { ok: true; value: T[idx] }
    } = (streams as any).map(() => ({ ok: false })) as any;

    const streamSubCancellations = streams.map(
      function combineLatest_processStream(stream, i) {
        const streamSubCancel = stream({
          next: function combineLatest_processStream_next(value) {
            latest[i].ok = true;
            latest[i].value = value;

            if (!oks) {
              for (const latestEntry of latest) {
                if (!latestEntry.ok) {
                  return resolved;
                }
              }
              oks = true;
            }

            return observer.next(latest.map(getValue) as T);
          },
          complete: function combineLatest_processStream_complete() {
            for (const cancel of streamSubCancellations.splice(0)) {
              if (cancel !== streamSubCancel) {
                cancel();
              }
            }
            return observer.complete();
          }
        });
        return streamSubCancel;
      }
    );

    return function combineLatest_cancel() {
      for (const cancel of streamSubCancellations.splice(0)) {
        cancel();
      }
    };
  });
}

function getValue<T extends { value: any }>(item: T): T["value"] {
  return item.value;
}
