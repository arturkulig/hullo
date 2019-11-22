import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation
} from "@hullo/core/Observable";
import { subject } from "@hullo/core/operators/subject";
import { Duplex } from "@hullo/core/Duplex";

export function ofEventTarget<VALUE_EVENT_META = void>(
  emitter: EventTarget,
  valueName: string,
  completionName?: string
) {
  const safeEmitter = modernizeEventTargetIfNecessary(emitter);

  return new Duplex<VALUE_EVENT_META, Event & VALUE_EVENT_META>(
    new Observable<Event & VALUE_EVENT_META>(
      new EventsProducer(safeEmitter, valueName, completionName)
    ).pipe(subject),
    {
      get closed() {
        return false;
      },

      next(meta: VALUE_EVENT_META) {
        safeEmitter.dispatchEvent(
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

class EventsProducer<VALUE_EVENT_META>
  implements ComplexProducer<Event & VALUE_EVENT_META> {
  constructor(
    private emitter: EventTarget,
    private valueName: string,
    private completionName?: string
  ) {}

  subscribe(observer: Observer<Event & VALUE_EVENT_META>) {
    function next(event: Event) {
      observer.next(event as Event & VALUE_EVENT_META);
    }
    function complete() {
      observer.complete();
    }

    this.emitter.addEventListener(this.valueName, next);
    if (this.completionName) {
      this.emitter.addEventListener(this.completionName, complete);
    }

    return new EventsCancel(
      this.emitter,
      this.valueName,
      next,
      this.completionName,
      complete
    );
  }
}

interface LegacyEventTarget {
  addListener(...args: any): void;
  dispatchEvent(...args: any): boolean;
  removeListener(...args: any): void;
}

function modernizeEventTargetIfNecessary(
  emitter: EventTarget | LegacyEventTarget
): EventTarget {
  if (isModernEventTarget(emitter)) {
    return emitter;
  }
  return {
    addEventListener(...args) {
      emitter.addListener(...args);
    },
    dispatchEvent(...args) {
      return emitter.dispatchEvent(...args);
    },
    removeEventListener(...args) {
      emitter.removeListener(...args);
    }
  };
}

function isModernEventTarget(
  emitter: EventTarget | LegacyEventTarget
): emitter is EventTarget {
  return "addEventListener" in emitter;
}

class EventsCancel implements Cancellation {
  constructor(
    private emitter: EventTarget,
    private valueName: string,
    private next: (event: Event) => any,
    private completionName?: string,
    private complete?: () => any
  ) {}

  cancel() {
    this.emitter.removeEventListener(this.valueName, this.next);
    if (this.completionName && this.complete) {
      this.emitter.removeEventListener(this.completionName, this.complete);
    }
  }
}
