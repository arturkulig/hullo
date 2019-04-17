import { render } from "./render";
import { DOMElement } from "./element";

export function mount(mount: HTMLElement, app: DOMElement) {
  const { element, possesion } = render(app);
  mount.appendChild(element);
  return () => {
    mount.removeChild(element);
    possesion.clean(element, true);
  };
}
