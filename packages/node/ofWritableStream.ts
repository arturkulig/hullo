import { Observer } from "@hullo/core/observable";

export function ofWritableStream(
  stream: NodeJS.WritableStream
): Observer<ArrayBuffer | string> {
  let closed = false;
  return {
    get closed() {
      return closed;
    },

    next(buffer) {
      if (closed) {
        return Promise.resolve();
      }
      return new Promise(r => {
        if (typeof buffer === "string") {
          stream.write(new Buffer(buffer, "utf-8"), r);
        } else {
          stream.write(new Buffer(buffer), r);
        }
      });
    },

    complete() {
      if (closed) {
        return Promise.resolve();
      }
      closed = true;
      return new Promise(r => {
        stream.end(r);
      });
    }
  };
}
