export function first<T>(subject: Iterable<T>) {
  for (const item of subject) {
    return item;
  }
}

export async function first$<T>(subject: AsyncIterable<T>) {
  for await (const item of subject) {
    return item;
  }
}
