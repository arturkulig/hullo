import { observable, subscribe } from "../core";

export function ref<T>(
  processor: (input: T) => (() => any) | (Promise<() => any>)
) {
  return function decorateSource(element$: AsyncIterable<T>): AsyncIterable<T> {
    return observable<T>(observer => {
      let current: { element: T; cleanup: () => any } | null = null;

      const sourceSub = subscribe(element$, {
        async next(element) {
          if (current) {
            current.cleanup();
            current = null;
          }

          const cleanup$ = processor(element);
          if (typeof cleanup$ === "function") {
            current = { element, cleanup: cleanup$ };
            return observer.next(element);
          } else {
            return cleanup$.then(cleanup => {
              current = { element, cleanup };
              return observer.next(element);
            });
          }
        },

        error(error) {
          if (current) {
            current.cleanup();
            current = null;
          }

          return observer.error(error);
        },

        complete() {
          if (current) {
            current.cleanup();
            current = null;
          }

          return observer.complete();
        }
      });

      return () => {
        if (!sourceSub.closed) {
          sourceSub.unsubscribe();
        }
        if (current) {
          current.cleanup();
          current = null;
        }
      };
    });
  };
}
