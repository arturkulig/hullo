import { observable } from "@hullo/core/observable";
import { subject } from "@hullo/core/operators/subject";
import { duplex } from "@hullo/core/duplex";

export function ofEventTarget<VALUE_EVENT_META = void>(
  emitter: EventTarget,
  valueName: string,
  completionName?: string
) {
  return duplex<VALUE_EVENT_META, Event & VALUE_EVENT_META>(
    observable<Event & VALUE_EVENT_META>(observer => {
      function next(event: Event) {
        observer.next(event as Event & VALUE_EVENT_META);
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
    }).pipe(subject),
    {
      get closed() {
        return false;
      },

      next(meta: VALUE_EVENT_META) {
        emitter.dispatchEvent(
          meta == null
            ? new Event(valueName)
            : Object.assign(new Event(valueName), meta)
        );
        return Promise.resolve();
      },

      complete() {
        return Promise.resolve();
      }
    }
  );
}
