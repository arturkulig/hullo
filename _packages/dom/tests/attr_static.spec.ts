import "jest-dom/extend-expect";
import { mount, html } from "..";

it("attr static", () => {
  const root = document.createElement("root");
  const end = mount(root, html.div({ attrs: { class: "test2" } }));
  const div = root.querySelector("div")!;
  expect(div).not.toBeUndefined();
  expect(div.getAttribute("class")).toBe("test2");
  end();
});
