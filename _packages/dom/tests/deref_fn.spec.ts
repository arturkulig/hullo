import "jest-dom/extend-expect";
import { mount, html } from "..";

it("deref fn", () => {
  const root = document.createElement("root");
  let element: HTMLElement | null = null;
  const end = mount(
    root,
    html.div({
      deref(e) {
        element = e;
      }
    })
  );
  expect(element).toBe(null);
  end();
  expect(element).not.toBe(null);
});
