import { IObservable, IObserver } from "../core/observable";

export type HulloElementChildren = HulloElement[] | IObservable<HulloElement[]>;

export type SyncMode = "immediate" | "self" | "branch";

export interface HulloElementDescription {
  sync?: SyncMode;
  ref?: (element: HTMLElement) => void;
  deref?: (element: HTMLElement) => void;
  attrs: { [id: string]: string | IObservable<string | undefined> };
  props: { [id: string]: any | IObservable<any> };
  style: {
    [id in keyof CSSStyleDeclaration]?: string | IObservable<string | undefined>
  };
  events: {
    [id: string]: IObserver<Event> | ((this: HTMLElement, event: Event) => any);
  };
  children: HulloElementChildren;
}

export interface HulloElement extends HulloElementDescription {
  tagName: string;
}

const emptyProps: {} = {};
const emptyChildren: [] = [];

export const element = (
  tagName: string,
  desc: Partial<HulloElementDescription>,
  children2?: HulloElementChildren
): HulloElement => ({
  tagName,
  attrs: emptyProps,
  props: emptyProps,
  style: emptyProps,
  events: emptyProps,
  children: emptyChildren,
  ...desc,
  ...(children2 ? { children: children2 } : emptyProps)
});
