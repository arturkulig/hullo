import { Redux } from "./redux";

it("Redux", async () => {
  const redux = new Redux(
    {
      addNumber(state, data: number) {
        return [...state, data];
      },
      async addString(state, data: string) {
        return [...state, data];
      }
    },
    new Array<string | number>()
  );

  await redux.next({ type: "addNumber", data: 0 });
  expect(redux.unwrap()).toEqual([0]);

  await redux.next({ type: "addString", data: "a" });
  expect(redux.unwrap()).toEqual([0, "a"]);
});
