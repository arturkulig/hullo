import { observable } from "../streams/observable";

export function interval(timeInMs: number) {
  return observable<number>(observer => {
    let token: any = null;

    tick();

    return () => {
      token && clearInterval(token);
    };

    function tick() {
      if (observer.closed) {
        return;
      }
      token = setTimeout(() => {
        observer.next(Date.now()).then(tick);
      }, timeInMs);
    }
  });
}
