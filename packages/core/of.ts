import { Observable, Observer, observable } from "./observable";

export function of<T>(
  source: AsyncIterable<T> | Iterable<T> | T
): Observable<T> {
  if (typeof source === "object" && Symbol.asyncIterator in source) {
    const asyncSource = source as AsyncIterable<T>;
    return observable<T, AsyncSourceContext<T>, AsyncSourceArg<T>>(
      asyncSourceProduce,
      asyncSourceContext,
      asyncSource
    );
  }
  if (typeof source === "object" && Symbol.iterator in source) {
    const syncSource = source as Iterable<T>;
    return observable<T, SyncSourceContext<T>, SyncSourceArg<T>>(
      syncSourceProduce,
      syncSourceContext,
      syncSource
    );
  }
  const unitSource = source as T;
  return observable<T, UnitContext<T>, UnitArg<T>>(
    unitProducer,
    unitContext,
    unitSource
  );
}

// ::of async iterable

type AsyncSourceArg<T> = AsyncIterable<T>;

interface AsyncSourceContext<T> {
  asyncIterable: AsyncIterable<T>;
  asyncIterator?: AsyncIterator<T>;
  resultHandler?: (r: IteratorResult<T>) => void;
  retrieving: boolean;
  drained: boolean;
  cancelled: boolean;
}

function asyncSourceContext<T>(arg: AsyncSourceArg<T>): AsyncSourceContext<T> {
  return {
    asyncIterable: arg,
    retrieving: false,
    drained: false,
    cancelled: false
  };
}

function asyncSourceProduce<T>(
  this: AsyncSourceContext<T>,
  observer: Observer<T>
) {
  this.resultHandler = (iteration: IteratorResult<T>) => {
    this.retrieving = false;
    if (this.cancelled && this.asyncIterator && this.asyncIterator.return) {
      this.asyncIterator.return();
    }
    if (this.drained || this.cancelled) {
      return;
    }
    if (iteration.done) {
      this.drained = true;
      observer.complete().then(() => asyncSourceIterate(this));
    } else {
      observer.next(iteration.value).then(() => asyncSourceIterate(this));
    }
  };
  asyncSourceIterate(this);

  return asyncSourceCancel;
}

function asyncSourceCancel<T>(this: AsyncSourceContext<T>) {
  this.cancelled = true;
  if (!this.retrieving && this.asyncIterator && this.asyncIterator.return) {
    this.asyncIterator.return();
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
  (
    context.asyncIterator ||
    (context.asyncIterator = context.asyncIterable[Symbol.asyncIterator]())
  )
    .next()
    .then(context.resultHandler);
}

// ::of async iterable

type SyncSourceArg<T> = Iterable<T>;

interface SyncSourceContext<T> {
  iterable: Iterable<T>;
  iterator?: Iterator<T>;
  observer?: Observer<T>;
  cancelled: boolean;
  drained: boolean;
}

function syncSourceContext<T>(arg: SyncSourceArg<T>): SyncSourceContext<T> {
  return { iterable: arg, cancelled: false, drained: false };
}

function syncSourceProduce<T>(
  this: SyncSourceContext<T>,
  observer: Observer<T>
) {
  this.observer = observer;
  syncSourceIterate(this);

  return syncSourceCancel;
}

function syncSourceCancel<T>(this: SyncSourceContext<T>) {
  this.cancelled = true;
  if (this.iterator && this.iterator.return) {
    this.iterator.return();
  }
}

function syncSourceIterate<T>(context: SyncSourceContext<T>) {
  if (!context.observer) {
    return;
  }

  if (context.drained || context.cancelled) {
    return;
  }

  const iteration = (
    context.iterator || (context.iterator = context.iterable[Symbol.iterator]())
  ).next();

  if (iteration.done) {
    context.drained = true;
    context.observer.complete().then(() => syncSourceIterate(context));
  } else {
    context.observer
      .next(iteration.value)
      .then(() => syncSourceIterate(context));
  }
}

// ::of single value

type UnitArg<T> = T;

interface UnitContext<T> {
  value: T;
  closed: boolean;
  observer?: Observer<T>;
}

function unitContext<T>(arg: UnitArg<T>): UnitContext<T> {
  return {
    value: arg,
    closed: false
  };
}

function unitProducer<T>(this: UnitContext<T>, observer: Observer<T>) {
  this.observer = observer;
  observer.next(this.value).then(() => unitClose(this));

  return unitCancel;
}

function unitClose<T>(context: UnitContext<T>) {
  if (context.closed) {
    return;
  }
  context.closed = true;
  context.observer!.complete();
}

function unitCancel<T>(this: UnitContext<T>) {
  if (this.closed) {
    return;
  }
  this.closed = true;
}
