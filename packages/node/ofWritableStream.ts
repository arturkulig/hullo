import { Observer } from "@hullo/core/observable";

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
    if (this.stream.writable) {
      return Promise.resolve();
    }
    return new Promise(r => {
      if (typeof value === "string") {
        this.stream.write(new Buffer(value, "utf-8"), r);
      } else {
        this.stream.write(new Buffer(value), r);
      }
    });
  }

  complete() {
    if (this.stream.writable) {
      return Promise.resolve();
    }
    return new Promise(r => {
      this.stream.end(r);
    });
  }
}
