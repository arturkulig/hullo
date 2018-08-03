import { observable } from "../core/streams/observable";
import { subscribe } from "../core/streams/subscribe";

export function buffer<T>(source: AsyncIterable<T>) {
  return observable<T>(observer => {
    let buffer: ({ value: T } | { error: any } | { done: true })[] = [];
    let pushing: boolean = false;

    const sub = subscribe(source, {
      next(value: T) {
        buffer.push({ value });
        tryPush();
      },
      error(error: any) {
        buffer.push({ error });
        tryPush();
      },
      complete() {
        buffer.push({ done: true });
        tryPush();
      }
    });

    return () => {
      buffer.splice(0);
      if (!sub.closed) {
        sub.unsubscribe();
      }
    };

    function tryPush() {
      if (pushing) {
        return;
      }
      push();
    }

    function push() {
      if (buffer.length === 0) {
        pushing = false;
        return;
      }
      pushing = true;
      const msg = buffer.shift()!;
      if ("value" in msg) {
        observer.next(msg.value).then(push);
      } else if ("error" in msg) {
        observer.error(msg.error).then(push);
      } else if ("done" in msg) {
        observer.complete().then(push);
      }
    }
  });
}
