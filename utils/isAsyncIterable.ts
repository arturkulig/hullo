export function isAsyncIterable<T = any>(
  subject: AsyncIterable<T> | any
): subject is AsyncIterable<T> {
  return (
    subject != null &&
    Object.getOwnPropertyDescriptor(subject, Symbol.asyncIterator) != null &&
    typeof subject[Symbol.asyncIterator] === "function"
  );
}
