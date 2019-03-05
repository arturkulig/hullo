import { Observable, Observer } from "./observable";
import { Cancellation, Task, resolved } from "../future/task";
import { future } from "../future/future";
import { solution } from "../future/solution";
import { schedule } from "../future";

enum BuffedType {
  next,
  complete
}
type Ack = (...args: any[]) => void;
type Buffed<T> =
  | {
      type: BuffedType.next;
      value: T;
      ack?: Ack;
      cancel?: Cancellation;
    }
  | {
      type: BuffedType.complete;
      ack?: Ack;
      cancel?: Cancellation;
    };

export function buffer<T>(source: Observable<T>): Observable<T> {
  return (observer: Observer<T>) => {
    const buff = Array<Buffed<T>>();
    let currentFrame: null | Buffed<T> = null;

    const unsub = source({
      next: function buffer_source_next(value) {
        return buffer_push({ type: BuffedType.next, value });
      },
      complete: function buffer_source_complete() {
        return buffer_push({ type: BuffedType.complete });
      }
    });

    return function buffer_cancel() {
      unsub();
      if (currentFrame) {
        const { cancel } = currentFrame;
        currentFrame = null;
        if (cancel) {
          schedule(cancel);
        }
      }
    };

    function buffer_push(frame: Buffed<T>): Task {
      if (!currentFrame) {
        currentFrame = frame;
        const sending =
          frame.type === BuffedType.next
            ? observer.next(frame.value)
            : observer.complete();
        const cancelSending = sending(buffer_wrapUp);
        frame.cancel = cancelSending;
        return solution(function buffer_push_onDone(consume) {
          const cancel = sending(consume);
          return () => {
            cancel();
            cancelSending();
          };
        });
      }

      return future(function buffer_push_whileFlushing(resolve) {
        buff.push(frame);
        frame.ack = resolve;

        schedule(buffer_flush);

        return () => {
          if (buff.includes(frame)) {
            buff.splice(buff.indexOf(frame), 1);
          }
          if (frame.cancel) {
            frame.cancel();
          }
          schedule(buffer_flush);
        };
      });
    }

    function buffer_flush() {
      if (buff.length && !currentFrame) {
        const frame = buff.shift()!;
        currentFrame = frame;
        const frameSending =
          frame.type === BuffedType.next
            ? observer.next(frame.value)
            : observer.complete();
        if (frameSending === resolved) {
          buffer_wrapUp();
        } else {
          const cancel = frameSending(buffer_wrapUp);
          frame.cancel = cancel;
        }
      }
    }

    function buffer_wrapUp() {
      if (!currentFrame) {
        return;
      }
      const { ack } = currentFrame;
      currentFrame = null;
      if (ack) {
        schedule(ack);
      }
      if (buff.length) {
        schedule(buffer_flush);
      }
    }
  };
}
