import { Observable, Observer } from "@hullo/core/observable";

export type DOMChildren =
  | (DOMElement | string)[]
  | Observable<(DOMElement | string)[]>;

export type SyncMode = "immediate" | "self" | "branch";

export interface DOMElementDesc {
  sync?: SyncMode;
  ref?: (element: HTMLElement) => void;
  deref?: (element: HTMLElement) => void;
  attrs: { [id: string]: string | Observable<string | undefined> };
  props: { [id: string]: any | Observable<any> };
  style: {
    [id in keyof CSSStyleDeclaration]?: string | Observable<string | undefined>
  };
  events: {
    [id: string]: Observer<Event> | ((this: HTMLElement, event: Event) => any);
  };
  children: DOMChildren;
}

export interface DOMElement extends DOMElementDesc {
  tagName: string;
}

const emptyObject: {} = {};
const emptyChildren: [] = [];

export function element(
  tagName: string,
  desc: Partial<DOMElementDesc>,
  children2?: DOMChildren
): DOMElement {
  return {
    tagName,
    attrs: emptyObject,
    props: emptyObject,
    style: emptyObject,
    events: emptyObject,
    children: emptyChildren,
    ...desc,
    ...(children2 ? { children: children2 } : emptyObject)
  };
}
