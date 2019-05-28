import { SyncMode } from "../element";
import { nextFrame } from "@hullo/browser/nextFrame";
import { Observer, Observable, Subscription } from "@hullo/core/observable";
import { RenderApplicator } from "./RenderApplicator";

export function renderEach<T>(
  syncMode: SyncMode,
  streamOrValue: Observable<T> | T,
  applier: RenderApplicator<T>
) {
  if (Observable.isObservable(streamOrValue)) {
    return new RenderEach(syncMode, streamOrValue, applier);
  }
  applier.process(streamOrValue);
  return null;
}

class RenderEach<T> implements Subscription {
  private valueSub: Subscription;
  get closed() {
    return this.valueSub.closed;
  }

  constructor(
    private syncMode: SyncMode,
    private stream: Observable<T>,
    private applier: RenderApplicator<T>
  ) {
    this.valueSub = this.stream.subscribe(
      this.syncMode !== "immediate"
        ? new RenderEachFramePacedObserver(this.applier)
        : new RenderEachObserver(this.applier)
    );
  }

  cancel() {
    if (!this.valueSub.closed) {
      this.valueSub.cancel();
    }
  }
}

class RenderEachObserver<T> implements Observer<T> {
  closed = false;

  constructor(private applier: RenderApplicator<T>) {}

  next(singleValue: T) {
    if (!this.closed) {
      this.applier.process(singleValue);
    }
    return Promise.resolve();
  }

  complete() {
    this.closed = true;
    return Promise.resolve();
  }
}

class RenderEachFramePacedObserver<T> implements Observer<T> {
  closed = false;

  constructor(private applier: RenderApplicator<T>) {}

  next(singleValue: T) {
    if (!this.closed) {
      this.applier.process(singleValue);
    }
    return nextFrame();
  }

  complete() {
    this.closed = true;
    return nextFrame();
  }
}
