import "jest-dom/extend-expect";
import { mount, html } from "..";

it("event observer", async () => {
  const root = document.createElement("root");
  let closed = false;
  let clicks = 0;
  let completions = 0;
  const end = mount(
    root,
    html.div({
      events: {
        click: {
          get closed() {
            return closed;
          },
          async next(event) {
            expect(event).toBeDefined();
            expect(event.target).toBe(div);
            clicks++;
          },
          async complete() {
            closed = true;
            completions++;
          }
        }
      }
    })
  );
  const div = root.querySelector("div")!;
  div.dispatchEvent(new Event("click"));
  expect(clicks).toBe(1);
  expect(completions).toBe(0);
  end();
  expect(completions).toBe(1);
});
