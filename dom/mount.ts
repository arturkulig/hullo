import { render } from "./render";
import { HulloElement } from "./element";

export function mount(mount: HTMLElement, app: HulloElement) {
  const { element, cancel } = render(app);
  mount.appendChild(element);
  return () => {
    mount.removeChild(element);
    cancel();
  };
}
