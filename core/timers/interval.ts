import { observable } from "../streams";
import { queue } from "../mods";

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
