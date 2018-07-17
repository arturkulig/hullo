import { switchMap } from "./switchMap";

(async () => {
  for await (const n of switchMap(
    (async function*() {
      yield (async function*() {
        yield 5;
        yield 6;
      })();
      yield (async function*() {
        yield 7;
        yield 8;
      })();
    })()
  )) {
    console.log(n);
  }
})();
