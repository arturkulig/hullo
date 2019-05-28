import { DOMElementDesc, DOMElement, DOMChildren, element } from "../element";
import { Observable } from "@hullo/core/observable";

export function bindToTag(tagName: string) {
  return elementOfTag;

  function elementOfTag(desc: Partial<DOMElementDesc>): DOMElement;
  function elementOfTag(children: DOMChildren): DOMElement;
  function elementOfTag(
    desc: Partial<DOMElementDesc>,
    children: DOMChildren
  ): DOMElement;
  function elementOfTag(...args: Array<Partial<DOMElementDesc> | DOMChildren>) {
    let desc: Partial<DOMElementDesc> = {};
    let children: DOMChildren = [];
    for (let i = 0, l = args.length; i < l; i++) {
      const arg = args[i];
      if (Array.isArray(arg) || Observable.isObservable(arg)) {
        children = arg;
      } else if (typeof arg === "object" && arg != null) {
        desc = arg;
      }
    }
    return element(tagName, desc, children);
  }
}
