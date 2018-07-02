import { AsyncObserver } from "./observableTypes";
import { subject } from "./subject";
import { observable } from "./observable";

const voidObserver: AsyncObserver<any, any> = {
  get closed() {
    return true;
  },
  next: () => Promise.resolve(),
  error: () => Promise.resolve(),
  complete: () => Promise.resolve()
};

export type AsyncPublicationObserver<T, ERR, SUBJECTS> = AsyncObserver<
  { subject: SUBJECTS; value: T },
  ERR
>;

export function publication<T, ERR = Error, ID = string>(
  producer: (observer: AsyncPublicationObserver<T, ERR, ID>) => void
) {
  const iterables = new Map<ID, AsyncIterable<T>>();
  const observers = new Map<ID, AsyncObserver<T, ERR>>();

  let producerLive = false;

  return getIterableOf;

  function getObserverOf(subjectId: ID) {
    if (!observers.has(subjectId)) {
      instantiateObserver(subjectId);
    }
    return observers.get(subjectId)!;
  }

  function getIterableOf(subjectId: ID) {
    if (!iterables.has(subjectId)) {
      instantiateIterable(subjectId);
    }
    return iterables.get(subjectId)!;
  }

  function instantiateObserver(subjectId: ID) {
    if (!producerLive) {
      instantiateProducer();
    }
    observers.set(subjectId, voidObserver);
  }

  function instantiateIterable(subjectId: ID) {
    if (!producerLive) {
      instantiateProducer();
    }

    iterables.set(
      subjectId,
      subject<T, ERR>(
        observable<T, ERR>(observer => {
          observers.set(subjectId, observer);
        })
      )
    );
  }

  function instantiateProducer() {
    const outerObserver: AsyncPublicationObserver<T, ERR, ID> = {
      get closed() {
        for (const [, observer] of observers) {
          if (!observer.closed) {
            return true;
          }
        }
        return false;
      },
      next({ subject: subjectId, value }) {
        return getObserverOf(subjectId).next(value);
      },
      async error(error) {
        await Promise.all(
          [...observers].map(([, observer]) => observer.error(error))
        );
      },
      async complete() {
        await Promise.all(
          [...observers].map(([, observer]) => observer.complete())
        );
      }
    };

    producerLive = true;

    producer(outerObserver);
  }
}
