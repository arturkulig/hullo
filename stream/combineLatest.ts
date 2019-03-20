import { resolved, then2, commit, task, Cancellation, schedule } from "../task";
import { pipe } from "../pipe";
import { Observable, Observer } from "./observable";
import { buffer } from "./buffer";

interface Frame<T> {
  completion: boolean;
  values: T;
  reasons: number[];
  sent: boolean;
  acks: () => Array<(v: void) => void>;
  cancel: null | Cancellation;
}

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

    let allOK = false;
    const oks: boolean[] = (streams as any[]).map(() => false);
    const values: T = [] as any;
    let queue: Frame<T>[] = [];

    function dispatch() {
      if (queue.length) {
        const instruction = queue.shift()!;
        instruction.cancel = (instruction.completion
          ? observer.complete()
          : observer.next(instruction.values))(() => {
          if (!instruction.sent) {
            instruction.sent = true;
            for (const ack of instruction.acks()) {
              ack();
            }
          }
          schedule(dispatch);
        });
      }
    }

    function enqueue(frame: Frame<T>) {
      let last = queue[queue.length - 1];
      if (
        queue.length &&
        (last.completion === true ||
          (last.completion === false &&
            frame.completion === false &&
            last.reasons.indexOf(frame.reasons[0]) < 0))
      ) {
        queue[queue.length - 1] = {
          acks: () => last.acks().concat(frame.acks()),
          cancel: () => {
            if (last.cancel) {
              last.cancel();
            }
            if (frame.cancel) {
              frame.cancel();
            }
          },
          completion: last.completion,
          reasons: last.reasons.concat(frame.reasons),
          sent: last.sent && frame.sent,
          values: frame.values
        };
      } else {
        queue.push(frame);
      }

      schedule(dispatch);

      return task<void>(function combineLatest_delivery(resolve) {
        if (frame.sent) {
          resolve();
        } else {
          frame.acks().push(resolve);
        }
        return () => {
          if (frame.cancel) {
            frame.cancel();
          }
          const pos = frame.acks().indexOf(resolve);
          if (pos >= 0) {
            frame.acks().splice(pos, 1);
          }
        };
      });
    }

    const streamSubCancellations = streams.map(
      function combineLatest_processStream(stream, i) {
        const streamSubCancel = stream({
          next: function combineLatest_processStream_next(value) {
            oks[i] = true;
            values[i] = value;

            if (!allOK) {
              for (const ok of oks) {
                if (!ok) {
                  return resolved;
                }
              }
              allOK = true;
            }

            const acks = new Array<(v: void) => void>();
            return enqueue({
              completion: false,
              values: values.concat([]) as any,
              reasons: [i],
              acks: () => acks,
              sent: false,
              cancel: null
            });
          },
          complete: function combineLatest_processStream_complete() {
            for (const cancel of streamSubCancellations.splice(0)) {
              if (cancel !== streamSubCancel) {
                cancel();
              }
            }

            const acks = new Array<(v: void) => void>();
            return enqueue({
              completion: true,
              values,
              reasons: [i],
              acks: () => acks,
              sent: false,
              cancel: null
            });
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
