import { Redux } from "./Redux";

describe("Redux", () => {
  it("overwrites state", async () => {
    const redux = new Redux(
      {
        addNumber(state, data: number) {
          return { state: [...state, data] };
        },
        async addString(state, data: string) {
          return { state: [...state, data] };
        }
      },
      new Array<string | number>()
    );

    await redux.next({ type: "addNumber", data: 0 });
    expect(redux.unwrap()).toEqual([0]);

    await redux.next({ type: "addString", data: "a" });
    expect(redux.unwrap()).toEqual([0, "a"]);
  });

  it("calls other actions", async () => {
    const redux = new Redux(
      {
        addNumber(state, data: number) {
          return {
            state: [...state, data],
            effects: [{ type: "addString", data: "ok" }]
          };
        },
        async addString(state, data: string) {
          return { state: [...state, data] };
        }
      },
      new Array<string | number>()
    );

    await redux.next({ type: "addNumber", data: 0 });
    expect(redux.unwrap()).toEqual([0, "ok"]);

    await redux.next({ type: "addNumber", data: 1 });
    expect(redux.unwrap()).toEqual([0, "ok", 1, "ok"]);
  });
});
