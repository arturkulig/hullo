import { render } from "./render";
import { DOMElement } from "./element";

export function mount(mount: HTMLElement, app: DOMElement) {
  const { element, subscription } = render(app);
  mount.appendChild(element);
  return () => {
    mount.removeChild(element);
    subscription.cancel();
  };
}
