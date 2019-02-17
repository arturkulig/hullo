import { observable } from "./observable";
import { buffer } from "./buffer";

export const interval = (span: number) =>
  buffer(
    observable<number>(observer => {
      const token = setInterval(() => {
        observer.next(Date.now());
      }, span);
      return () => {
        clearInterval(token);
      };
    })
  );
