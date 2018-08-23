import { subscribe } from "../core";

export function render(mount: HTMLElement, root$: AsyncIterable<HTMLElement>) {
  let last: HTMLElement | null = null;
  return subscribe(root$, {
    async next(root) {
      if (last) {
        mount.removeChild(last);
      }
      mount.appendChild(root);
      last = root;
    }
  });
}
