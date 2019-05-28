import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation
} from "@hullo/core/Observable";
import { Duplex } from "@hullo/core/Duplex";

export function ofEventEmitter<DATA extends any[] = any[]>(
  emitter: NodeJS.EventEmitter,
  valueName: string,
  completionName?: string
) {
  return new Duplex<DATA, DATA>(
    new Observable<DATA>(
      new EventsProducer<DATA>(emitter, valueName, completionName)
    ),
    new EventsBroadcast(emitter, valueName, completionName)
  );
}

class EventsBroadcast<DATA extends any[]> implements Observer<DATA> {
  get closed() {
    return false;
  }

  constructor(
    private emitter: NodeJS.EventEmitter,
    private valueName: string,
    private completionName?: string
  ) {}

  next(args: any[]) {
    this.emitter.emit(this.valueName, ...args);
    return Promise.resolve();
  }

  complete() {
    if (this.completionName) {
      this.emitter.emit(this.completionName);
    }
    return Promise.resolve();
  }
}

class EventsProducer<DATA extends any[]> implements ComplexProducer<DATA> {
  constructor(
    private emitter: NodeJS.EventEmitter,
    private valueName: string,
    private completionName?: string
  ) {}

  subscribe(observer: Observer<DATA>) {
    function next(...args: any[]) {
      observer.next(args as DATA);
    }

    function complete() {
      observer.complete();
    }

    this.emitter.on(this.valueName, next);
    if (this.completionName) {
      this.emitter.on(this.completionName, complete);
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
    private emitter: NodeJS.EventEmitter,
    private valueName: string,
    private next: (...args: any[]) => any,
    private completionName?: string,
    private complete?: (...args: any[]) => any
  ) {}

  cancel() {
    this.emitter.off(this.valueName, this.next);
    if (this.completionName && this.complete) {
      this.emitter.off(this.completionName, this.complete);
    }
  }
}
