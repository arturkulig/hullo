export function take(amount: number) {
  return function* _take<T>(subject: Iterable<T>) {
    let currentLength = 0;
    for (const item of subject) {
      if (currentLength >= amount) {
        return;
      }
      currentLength++;
      yield item;
      if (currentLength >= amount) {
        return;
      }
    }
  };
}

export function take$(amount: number) {
  return async function _take$<T>(subject: AsyncIterable<T>) {
    const result = new Array<T>();
    if (result.length >= amount) {
      return result;
    }
    for await (const item of subject) {
      result.push(item);
      if (result.length >= amount) {
        break;
      }
    }
    return result;
  };
}
