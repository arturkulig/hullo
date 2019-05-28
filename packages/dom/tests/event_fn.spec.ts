import "jest-dom/extend-expect";
import { mount, html } from "..";

it("event fn", () => {
  const root = document.createElement("root");
  let clicks = 0;
  const end = mount(
    root,
    html.div({
      events: {
        click(event) {
          expect(event).toBeDefined();
          expect(event.target).toBe(div);
          clicks++;
        }
      }
    })
  );
  const div = root.querySelector("div")!;
  div.dispatchEvent(new Event("click"));
  expect(clicks).toBe(1);
  end();
});
