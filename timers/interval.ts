import { observable } from "../core/observable";
import { queue } from "../mods/queue";

export function interval(timeInMs: number) {
  return observable<number>(
    queue(observer => {
      observer.next(Date.now());
      const token = setInterval(() => {
        observer.next(Date.now());
      }, timeInMs);
      return () => {
        clearInterval(token);
      };
    })
  );
}
