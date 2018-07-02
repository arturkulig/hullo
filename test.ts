import { observable } from "./observable";
(async () => {
  try {
    for await (const x of observable(o => {
      o.next(1)
        .then(() => {
          console.log("first gone");
          return o.next(2);
        })
        .then(() => o.complete(), console.error);
      return () => {
        console.log("done");
      };
    })) {
      console.log(x);
    }
  } catch (e) {
    console.error("Caught");
    console.error(e);
  }
})();
