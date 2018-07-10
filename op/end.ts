export async function end$<T>(subject: AsyncIterable<T>) {
  for await (const _ of subject) {
  }
}
