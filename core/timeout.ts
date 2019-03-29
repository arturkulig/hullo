export function timeout(time: number): Promise<void>;
export function timeout<T>(time: number, value: () => T): Promise<T>;
export function timeout<T>(time: number, value: T): Promise<T>;
export function timeout(time: number, value?: any): Promise<any> {
  return new Promise(r => {
    if (typeof value === "function") {
      setTimeout(() => r(value()), time);
    } else {
      setTimeout(r, time, value);
    }
  });
}
