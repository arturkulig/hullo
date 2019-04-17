import { Observable, Observer } from "@hullo/core/observable";

export type DOMChildren = DOMElement[] | Observable<DOMElement[]>;

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

const emptyProps: {} = {};
const emptyChildren: [] = [];

export const element = (
  tagName: string,
  desc: Partial<DOMElementDesc>,
  children2?: DOMChildren
): DOMElement => ({
  tagName,
  attrs: emptyProps,
  props: emptyProps,
  style: emptyProps,
  events: emptyProps,
  children: emptyChildren,
  ...desc,
  ...(children2 ? { children: children2 } : emptyProps)
});
