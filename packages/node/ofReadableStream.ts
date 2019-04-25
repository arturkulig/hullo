import { observable, Observable, Observer } from "@hullo/core/observable";
import { Writable } from "stream";

export function ofReadableStream(
  stream: NodeJS.ReadableStream
): Observable<ArrayBuffer | string> {
  return observable<
    ArrayBuffer | string,
    OfReadableStreamContext,
    OfReadableStreamArg
  >(ofReadableStreamProducer, ofReadableStreamContext, stream);
}

function ofReadableStreamProducer(
  this: OfReadableStreamContext,
  observer: Observer<ArrayBuffer | string>
) {
  const { stream } = this;
  stream.pipe(
    new Writable({
      write(data: unknown, _encoding, cb) {
        if (!observer.closed) {
          observer.next(normalize(data)).then(() => {
            cb();
          });
        }
      },
      final() {
        observer.complete();
      }
    })
  );
}

function normalize(data: unknown) {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.buffer;
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return data.buffer;
  }
  throw new Error();
}

function ofReadableStreamContext(
  arg: OfReadableStreamArg
): OfReadableStreamContext {
  return {
    stream: arg
  };
}

interface OfReadableStreamContext {
  stream: NodeJS.ReadableStream;
}

interface OfReadableStreamArg extends NodeJS.ReadableStream {}
