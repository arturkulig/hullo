export function last<T>(subject: Iterable<T>) {
  let result: T | undefined;
  for (const item of subject) {
    result = item;
  }
  return result;
}

export async function last$<T>(subject: AsyncIterable<T>) {
  let result: T | undefined;
  for await (const item of subject) {
    result = item;
  }
  return result;
}
