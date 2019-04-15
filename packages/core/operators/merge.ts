import { Observable, observable, Observer, Subscription } from "../observable";

export function merge<T, U = T>(other: Observable<T>) {
  return function mergeI(source: Observable<U>): Observable<T | U> {
    return observable<T | U, MergeContext<T, U>, MergeArg<T, U>>(
      mergeProduce,
      mergeContext,
      { source, other }
    );
  };
}

function mergeContext<T, U>(arg: MergeArg<T, U>): MergeContext<T, U> {
  return {
    source: arg.source,
    other: arg.other,
    observer: null,
    otherSub: null,
    sourceSub: null
  };
}

function mergeProduce<T, U>(
  this: MergeContext<T, U>,
  observer: Observer<T | U>
) {
  this.observer = observer;
  this.sourceSub = this.source.subscribe(
    {
      next,
      complete
    },
    this
  );
  this.otherSub = this.other.subscribe(
    {
      next,
      complete
    },
    this
  );

  return mergeCancel;
}

function next<T, U>(this: MergeContext<T, U>, value: T | U) {
  return this.observer ? this.observer.next(value) : Promise.resolve();
}

function complete<T, U>(this: MergeContext<T, U>) {
  return this.observer &&
    ((!this.sourceSub || this.sourceSub.closed) &&
      (!this.otherSub || this.otherSub.closed))
    ? this.observer.complete()
    : Promise.resolve();
}

function mergeCancel<T, U>(this: MergeContext<T, U>) {
  if (this.otherSub) {
    const { otherSub } = this;
    this.otherSub = null;
    if (!otherSub.closed) {
      otherSub.cancel();
    }
  }
  if (this.sourceSub) {
    const { sourceSub } = this;
    this.sourceSub = null;
    if (!sourceSub.closed) {
      sourceSub.cancel();
    }
  }
}

interface MergeArg<T, U> {
  source: Observable<U>;
  other: Observable<T>;
}

interface MergeContext<T, U> extends MergeArg<T, U> {
  observer: Observer<T | U> | null;
  sourceSub: Subscription | null;
  otherSub: Subscription | null;
}
