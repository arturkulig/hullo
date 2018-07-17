import { h, Props } from "./h";

export const html = {
  div: ofElement("div")
};

function ofElement<TAG extends keyof HTMLElementTagNameMap>(tagName: TAG) {
  return (
    props: Props<HTMLElementTagNameMap[TAG]> = {},
    ...children: Array<AsyncIterable<HTMLElement | null> | HTMLElement>
  ) => h(tagName, props, ...children);
}
