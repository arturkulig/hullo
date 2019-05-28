import "jest-dom/extend-expect";
import { mount, html } from "..";

it("ref fn", () => {
  const root = document.createElement("root");
  let element: HTMLElement | null = null;
  const end = mount(
    root,
    html.div({
      ref(e) {
        element = e;
      }
    })
  );
  expect(element).not.toBe(null);
  end();
});
