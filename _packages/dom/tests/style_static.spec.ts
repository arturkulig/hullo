import "jest-dom/extend-expect";
import { mount, html } from "..";

it("style static", () => {
  const root = document.createElement("root");
  const end = mount(root, html.div({ style: { display: "inline" } }));
  const div = root.querySelector("div")!;
  expect(div).not.toBeUndefined();
  expect(div.style.display).toBe("inline");
  end();
});
