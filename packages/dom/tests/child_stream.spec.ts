import "jest-dom/extend-expect";
import { mount, html } from "..";
import { Observable, Observer } from "@hullo/core/observable";
import { DOMElement } from "../element";

const nullObserver: Observer<any> = {
  closed: false,
  async next() {},
  async complete() {}
};

it("child stream", async () => {
  const root = document.createElement("root");
  let observer: Observer<DOMElement[]> = nullObserver;
  const end = mount(
    root,
    html.div(
      new Observable<DOMElement[]>(_observer => {
        observer = _observer;
      })
    )
  );

  const div = root.querySelector("div")!;

  expect(root).toContainElement(div);

  const spanADef = html.span({ props: { id: "spanA" } });
  const spanBDef = html.span({ props: { id: "spanB" } });
  const spanCDef = html.span({ props: { id: "spanC" } });

  // new element
  await observer.next([spanADef]);
  expect(div.children.length).toBe(1);
  const spanA1 = div.querySelector("#spanA")!;
  expect(spanA1).not.toBe(null);

  // element replacement
  await observer.next([spanBDef]);
  expect(div.children.length).toBe(1);
  expect(div.querySelector("#spanA")).toBe(null);
  const spanB2 = div.querySelector("#spanB")!;
  expect(spanB2).not.toBe(null);
  expect(spanA1).not.toBe(spanB2);

  // element appended
  await observer.next([spanBDef, spanCDef]);
  expect(div.children.length).toBe(2);
  const spanB3 = div.querySelector("#spanB")!;
  const spanC3 = div.querySelector("#spanC")!;
  expect(spanB3).not.toBe(null);
  expect(spanC3).not.toBe(null);
  expect(spanB3).toBe(spanB2);
  expect(div.children[0]).toBe(spanB3);
  expect(div.children[1]).toBe(spanC3);

  // element shuffled
  await observer.next([spanCDef, spanBDef]);
  expect(div.children.length).toBe(2);
  const spanB4 = div.querySelector("#spanB")!;
  const spanC4 = div.querySelector("#spanC")!;
  expect(spanB4).not.toBe(null);
  expect(spanC4).not.toBe(null);
  expect(spanB4).toBe(spanB3);
  expect(spanC4).toBe(spanC3);
  expect(div.children[0]).toBe(spanC4);
  expect(div.children[1]).toBe(spanB4);

  // element removed
  await observer.next([spanBDef]);
  expect(div.children.length).toBe(1);
  const spanB5 = div.querySelector("#spanB")!;
  const spanC5 = div.querySelector("#spanC")!;
  expect(spanB5).not.toBe(null);
  expect(spanC5).toBe(null);
  expect(spanB5).toBe(spanB4);

  end();
});
