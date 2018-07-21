export function isIterable<T = any>(
  subject: Iterable<T> | any
): subject is Iterable<T> {
  return (
    subject != null &&
    Symbol.iterator in subject &&
    typeof subject[Symbol.iterator] === "function"
  );
}
