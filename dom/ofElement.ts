import { h, Props } from "./h";

export function ofElement<TAG extends keyof ElementTagNameMap>(tagName: TAG) {
    return (
      props: Props<ElementTagNameMap[TAG]> = {},
      ...children: Array<
        AsyncIterable<HTMLElement[] | HTMLElement | null> | HTMLElement
      >
    ) => h(tagName, props, ...children);
  }