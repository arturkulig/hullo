import { observable } from "./observable";
import { buffer } from "./buffer";

export const interval = (span: number) =>
  buffer(
    observable<number>(observer => {
      let cancel = () => {};

      cancel = observer.next(Date.now())(() => {
        const token = setInterval(() => {
          observer.next(Date.now());
        }, span);
        cancel = () => {
          clearInterval(token);
        };
      });

      return () => {
        cancel();
      };
    })
  );
