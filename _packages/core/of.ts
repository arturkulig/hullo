import {
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "./Observable";

export function of<T>(
  source: AsyncIterable<T> | Iterable<T> | T,
  autoclose = true
): Observable<T> {
  if (typeof source === "object" && Symbol.asyncIterator in source) {
    const asyncSource = source as AsyncIterable<T>;
    return new Observable<T>(new AsyncSourceProducer(asyncSource, autoclose));
  }
  if (typeof source === "object" && Symbol.iterator in source) {
    const syncSource = source as Iterable<T>;
    return new Observable<T>(new SyncSourceProducer(syncSource, autoclose));
  }
  const unitSource = source as T;
  return new Observable<T>(new UnitProducer(unitSource, autoclose));
}

// ::of async iterable

interface AsyncSourceContext<T> {
  observer: Observer<T>;
  asyncIterable: AsyncIterable<T>;
  asyncIterator: AsyncIterator<T>;
  retrieving: boolean;
  drained: boolean;
  cancelled: boolean;
  autoclose: boolean;
}

class AsyncSourceProducer<T> implements ComplexProducer<T> {
  constructor(private source: AsyncIterable<T>, private autoclose: boolean) {}

  subscribe(observer: Observer<T>) {
    const context: AsyncSourceContext<T> = {
      observer,
      asyncIterable: this.source,
      asyncIterator: this.source[Symbol.asyncIterator](),
      retrieving: false,
      drained: false,
      cancelled: false,
      autoclose: this.autoclose
    };

    asyncSourceIterate(context);

    return new AsyncSourceCancel(context);
  }
}

function asyncSourceIterate<T>(context: AsyncSourceContext<T>) {
  if (
    context.cancelled &&
    context.asyncIterator &&
    context.asyncIterator.return
  ) {
    context.asyncIterator.return();
  }
  if (context.cancelled || context.drained) {
    return;
  }

  context.retrieving = true;
  context.asyncIterator
    .next()
    .then(iteration => resultHandler(context, iteration));
}

function resultHandler<T>(
  context: AsyncSourceContext<T>,
  iteration: IteratorResult<T>
) {
  context.retrieving = false;
  if (
    context.cancelled &&
    context.asyncIterator &&
    context.asyncIterator.return
  ) {
    context.asyncIterator.return();
  }
  if (context.drained || context.cancelled) {
    return;
  }
  if (iteration.done) {
    context.drained = true;
    if (context.autoclose) {
      context.observer.complete();
    }
  } else {
    context.observer
      .next(iteration.value)
      .then(() => asyncSourceIterate(context));
  }
}

class AsyncSourceCancel<T> implements Cancellation {
  constructor(private context: AsyncSourceContext<T>) {}

  cancel() {
    this.context.cancelled = true;
    if (
      !this.context.retrieving &&
      this.context.asyncIterator &&
      this.context.asyncIterator.return
    ) {
      this.context.asyncIterator.return();
    }
  }
}

// ::of sync iterable

interface SyncSourceContext<T> {
  observer: Observer<T>;
  iterable: Iterable<T>;
  iterator?: Iterator<T>;
  drained: boolean;
  cancelled: boolean;
  autoclose: boolean;
}

class SyncSourceProducer<T> implements ComplexProducer<T> {
  constructor(private source: Iterable<T>, private autoclose: boolean) {}

  subscribe(observer: Observer<T>) {
    const context: SyncSourceContext<T> = {
      observer,
      iterable: this.source,
      drained: false,
      cancelled: false,
      autoclose: this.autoclose
    };

    syncSourceIterate(context);

    return new SyncSourceCancel(context);
  }
}

function syncSourceIterate<T>(context: SyncSourceContext<T>) {
  if (context.drained || context.cancelled) {
    return;
  }

  const iteration = (
    context.iterator || (context.iterator = context.iterable[Symbol.iterator]())
  ).next();

  if (iteration.done) {
    context.drained = true;
    if (context.autoclose) {
      context.observer.complete();
    }
  } else {
    context.observer
      .next(iteration.value)
      .then(() => syncSourceIterate(context));
  }
}

class SyncSourceCancel<T> implements Cancellation {
  constructor(private context: SyncSourceContext<T>) {}

  cancel() {
    this.context.cancelled = true;
    if (this.context.iterator && this.context.iterator.return) {
      this.context.iterator.return();
    }
  }
}
// ::of single value

class UnitProducer<T> implements ComplexProducer<T> {
  constructor(private value: T, private autoclose: boolean) {}

  subscribe(observer: Observer<T>) {
    observer.next(this.value).then(() => {
      if (observer.closed) {
        return;
      }
      if (this.autoclose) {
        observer.complete();
      }
    });
  }
}
