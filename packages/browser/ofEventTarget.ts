import { observable } from "@hullo/core/observable";
import { duplex } from "@hullo/core/duplex";

export function ofEventTarget(
  emitter: EventTarget,
  valueName: string,
  completionName?: string
) {
  return duplex<Event, Event>(
    observable<Event>(observer => {
      function next(event: Event) {
        observer.next(event);
      }
      function complete() {
        observer.complete();
      }

      emitter.addEventListener(valueName, next);
      if (completionName) {
        emitter.addEventListener(completionName, complete);
      }

      return () => {
        emitter.removeEventListener(valueName, next);
        if (completionName) {
          emitter.removeEventListener(completionName, complete);
        }
      };
    }),
    {
      next(event: Event) {
        emitter.dispatchEvent(event);
        return Promise.resolve();
      },
      complete() {
        return Promise.resolve();
      }
    }
  );
}
