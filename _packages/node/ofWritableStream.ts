import { Observer } from "@hullo/core/Observable";

export function ofWritableStream(
  stream: NodeJS.WritableStream
): Observer<ArrayBuffer | string> {
  return new WritableStreamObserver(stream);
}

class WritableStreamObserver implements Observer<ArrayBuffer | string> {
  get closed() {
    return this.stream.writable;
  }

  constructor(private stream: NodeJS.WritableStream) {}

  next(value: ArrayBuffer | string) {
    if (!this.stream.writable) {
      return new Promise((resolve, reject) => {
        this.stream.once("drain", () => {
          this.push(value).then(resolve, reject);
        });
      });
    } else {
      return this.push(value);
    }
  }

  complete() {
    return new Promise(r => {
      this.stream.end(r);
    });
  }

  push(value: ArrayBuffer | string) {
    return new Promise(r => {
      if (typeof value === "string") {
        this.stream.write(value, "utf-8", () => r());
      } else {
        this.stream.write(Buffer.from(value), () => r());
      }
    });
  }
}
