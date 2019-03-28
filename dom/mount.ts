import { render } from "./render";
import { HulloElement } from "./element";

export function mount(mount: HTMLElement, app: HulloElement) {
  const { element, possesion } = render(app);
  mount.appendChild(element);
  return () => {
    mount.removeChild(element);
    possesion.clean(element, true);
  };
}
