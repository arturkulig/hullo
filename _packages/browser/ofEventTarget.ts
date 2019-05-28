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
  return new Duplex<VALUE_EVENT_META, Event & VALUE_EVENT_META>(
    new Observable<Event & VALUE_EVENT_META>(
      new EventsProducer(emitter, valueName, completionName)
    ).pipe(subject),
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
