import {
  Observable,
  Observer,
  ComplexProducer,
  Cancellation
} from "@hullo/core/Observable";
import { Writable } from "stream";

export function ofReadableStream(stream: NodeJS.ReadableStream) {
  return new Observable(new ReadableStreamProducer(stream));
}

class ReadableStreamProducer implements ComplexProducer<ArrayBuffer | string> {
  constructor(private stream: NodeJS.ReadableStream) {}

  subscribe(observer: Observer<ArrayBuffer | string>) {
    const sink = new Writable({
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
    });
    this.stream.pipe(sink);

    return new ReadableStreamCancel(this.stream, sink);
  }
}

class ReadableStreamCancel implements Cancellation {
  constructor(
    private stream: NodeJS.ReadableStream,
    private sink: NodeJS.WritableStream
  ) {}

  cancel() {
    this.stream.unpipe(this.sink);
  }
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
