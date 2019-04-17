import { Observer } from "@hullo/core/observable";

export function ofWritableStream(
  stream: NodeJS.WritableStream
): Observer<Buffer | Uint8Array | string> {
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
        stream.write(buffer, r);
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
