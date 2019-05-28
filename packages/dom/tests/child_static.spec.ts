import "jest-dom/extend-expect";
import { mount, html } from "..";

it("child static", () => {
  const root = document.createElement("root");
  const end = mount(root, html.div([html.span({})]));

  const div = root.querySelector("div");
  const span = root.querySelector("span");

  // elements are mounted
  expect(root).toContainElement(div);
  expect(div).toContainElement(span);

  end();

  // elements are removed
  expect(root).not.toContainElement(div);
  // but not deep
  expect(div).toContainElement(span);
});
