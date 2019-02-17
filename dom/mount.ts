import { render } from "./render";
import { ElementShape } from "./element";

export function mount(mount: HTMLElement, app: ElementShape) {
  const { element, cancel } = render(app);
  mount.appendChild(element);
  return () => {
    mount.removeChild(element);
    cancel();
  };
}
