import { Observable, Observer } from "../stream/observable";

export type HulloElementChildren = HulloElement[] | Observable<HulloElement[]>;

export interface SyncOptions {
  sync?: undefined | "self" | "branch";
}

export interface HulloElementDescription extends SyncOptions {
  attrs: { [id: string]: string | Observable<string | undefined> };
  props: { [id: string]: any | Observable<any> };
  style: {
    [id in keyof CSSStyleDeclaration]?: string | Observable<string | undefined>
  };
  events: { [id: string]: Observer<Event> | ((event: Event) => any) };
  children: HulloElementChildren;
}

export interface HulloElement extends HulloElementDescription {
  tagName: string;
}

export const element = (
  tagName: string,
  desc: Partial<HulloElementDescription>,
  children2?: HulloElementChildren
): HulloElement => ({
  tagName,
  attrs: desc.attrs || {},
  props: desc.props || {},
  style: desc.style || {},
  events: desc.events || {},
  children: children2 || desc.children || []
});
