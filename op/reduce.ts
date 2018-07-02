import { dualOp } from "../utils/dualOp";

type RegulatePromise<T> = T extends Promise<Promise<infer U>>
  ? Promise<U>
  : T extends Promise<infer U> ? T : Promise<T>;

export function reduce<ITEM, RESULT>(
  accumulator: (result: RESULT, item: ITEM, ordinal: number) => RESULT,
  initial: RESULT
) {
  type SYNC_RESULT = RESULT;
  type ASYNC_RESULT = RegulatePromise<RESULT>;
  return dualOp<ITEM, SYNC_RESULT, ASYNC_RESULT>(
    reduceSync,
    (reduceAsync as any) as (value: AsyncIterable<ITEM>) => ASYNC_RESULT
  );

  function reduceSync(subject: Iterable<ITEM>): SYNC_RESULT {
    let ordinal = 0;
    let result: RESULT = initial;
    for (const item of subject) {
      result = accumulator(result, item, ordinal);
    }
    return result;
  }

  async function reduceAsync(subject: AsyncIterable<ITEM>) {
    let ordinal = 0;
    let result = initial;
    for await (const item of subject) {
      result = accumulator(result, item, ordinal);
    }
    return result;
  }
}
