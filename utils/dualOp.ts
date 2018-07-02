import { isIterable } from "../utils/isIterable";
import { isAsyncIterable } from "../utils/isAsyncIterable";

export function dualOp<IN, OUT_SYNC, OUT_ASYNC>(
  syncXD: (subject: Iterable<IN>) => OUT_SYNC,
  asyncXD: (subject: AsyncIterable<IN>) => OUT_ASYNC
) {
  return XD;

  function XD(subject: Iterable<IN>): OUT_SYNC;
  function XD(subject: AsyncIterable<IN>): OUT_ASYNC;
  function XD(subject: any): OUT_SYNC | OUT_ASYNC {
    if (isIterable<IN>(subject)) {
      return syncXD(subject);
    } else if (isAsyncIterable<IN>(subject)) {
      return asyncXD(subject);
    }
    throw null;
  }
}
