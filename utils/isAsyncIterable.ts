export function isAsyncIterable<T = any>(
  subject: AsyncIterable<T> | any
): subject is AsyncIterable<T> {
  return (
    subject != null &&
    Symbol.asyncIterator in subject &&
    typeof subject[Symbol.asyncIterator] === "function"
  );
}
