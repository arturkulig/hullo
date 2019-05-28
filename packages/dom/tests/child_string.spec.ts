import "jest-dom/extend-expect";
import { mount, html } from "..";

it("child string", () => {
  const root = document.createElement("root");
  const end = mount(root, html.div([html.span(["test"])]));

  const div = root.querySelector("div")!;
  expect(div.textContent).toBe("test");
  end();
});
