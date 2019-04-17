import { observable, Observable, Observer } from "@hullo/core/observable";
import { Writable } from "stream";

export function ofReadableStream(
  stream: NodeJS.ReadableStream
): Observable<Buffer | Uint8Array | string> {
  return observable<
    Buffer | Uint8Array | string,
    OfReadableStreamContext,
    OfReadableStreamArg
  >(ofReadableStreamProducer, ofReadableStreamContext, stream);
}

function ofReadableStreamProducer(
  this: OfReadableStreamContext,
  observer: Observer<Buffer | Uint8Array | string>
) {
  const { stream } = this;
  stream.pipe(
    new Writable({
      write(data: Buffer | Uint8Array | string, _encoding, cb) {
        if (!observer.closed) {
          observer.next(data).then(() => {
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
