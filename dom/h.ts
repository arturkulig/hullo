import { observable } from "../core/observable";
import { atom } from "../core/atom";
import { AsyncObserver } from "../core/observableTypes";
import { combineLatest } from "../op/combineLatest";
import { scan$ } from "../op/scan";
import { map$ } from "../op/map";
import { subscribe, Subscription } from "../utils/subscribe";
import { isAsyncIterable } from "../utils/isAsyncIterable";

type Chunk = HTMLElement | null;
type Child = HTMLElement[] | Chunk;

export type Props<E extends object> = {
  [K in keyof E]?: K extends "style"
    ? { [id in keyof E[K]]?: E[K][id] | AsyncIterable<E[K][id]> }
    : E[K] extends ((event: infer EVENT) => any)
      ? (E[K] | AsyncObserver<EVENT, Error>)
      : (E[K] | AsyncIterable<E[K]>)
};

let lastID = 0;
const DEBUG = false;

export function h<TAG extends keyof HTMLElementTagNameMap>(
  tagName: TAG,
  props: Props<HTMLElementTagNameMap[TAG]> = {},
  ...children: Array<
    AsyncIterable<HTMLElement[] | HTMLElement | null> | HTMLElement
  >
) {
  return observable<HTMLElement>(observer => {
    const element = document.createElement(tagName);
    const id = (lastID++).toString();
    element.dataset.id = id;

    DEBUG && console.log(id, "creating");

    const propsSubs: Subscription[] = [];

    for (const p in props) {
      if (p === "style" && props[p]) {
        const style = props[p]!;

        for (const ruleName in style) {
          const rule = (style as any)[ruleName];
          if (rule && isAsyncIterable(rule)) {
            propsSubs.push(
              subscribe(rule, {
                next(ruleValue) {
                  DEBUG && console.log(id, `.style.${ruleName}\$`, rule);
                  element.style[ruleName as any] = ruleValue;
                }
              })
            );
          } else if (rule) {
            DEBUG && console.log(id, `.style.${ruleName}`, rule);
            element.style[ruleName as any] = rule;
          }
        }
      } else {
        const staticProp = (props as any)[p];

        if (isAsyncIterable(staticProp)) {
          propsSubs.push(
            subscribe(staticProp, {
              next(dynamicProp) {
                DEBUG && console.log(id, `.${p}\$`, dynamicProp);
                (element as any)[p] = dynamicProp;
              }
            })
          );
        } else {
          DEBUG && console.log(id, `.${p}`, staticProp);

          if (
            staticProp &&
            typeof staticProp === "object" &&
            "next" in staticProp &&
            typeof staticProp.next === "function" &&
            p.slice(0, 2) === "on"
          ) {
            (element as any)[p] = (event: any) => staticProp.next(event);
          } else {
            (element as any)[p] = staticProp;
          }
        }
      }
    }

    const flatChildren = flattenChildren(
      setupLastAndNext(
        combineLatest(
          children.map(child => (isAsyncIterable(child) ? child : atom(child)))
        )
      )
    );

    const childrenSub =
      children.length === 0
        ? null
        : subscribe(flatChildren, {
            async next([lastElements, nextElements]: [Chunk[], Chunk[]]) {
              DEBUG &&
                console.log(
                  id,
                  "diff",
                  lastElements.map(e => (e ? e.dataset.id : "null")),
                  nextElements.map(e => (e ? e.dataset.id : "null"))
                );

              const length = Math.max(lastElements.length, nextElements.length);

              for (let i = 0; i < length; i++) {
                const lastElement = lastElements[i] || null;
                const nextElement = nextElements[i] || null;
                if (lastElement === nextElement) {
                  // same element
                  DEBUG && console.log(id, `.${i}`, "same");
                  continue;
                }
                if (lastElement == null && nextElement == null) {
                  // both empty
                  DEBUG && console.log(id, `.${i}`, "null");
                  continue;
                }
                if (lastElement != null && nextElement == null) {
                  // removing
                  DEBUG && console.log(id, `.${i} removing`, lastElement);
                  element.removeChild(lastElement);
                  continue;
                }
                if (lastElement == null && nextElement != null) {
                  // adding
                  DEBUG && console.log(id, `.${i} adding`, nextElement);
                  let latterPossibleElements = lastElements.slice(i);
                  let latterElement: HTMLElement | null = null;
                  for (const possibleNextElement of latterPossibleElements) {
                    if (possibleNextElement) {
                      latterElement = possibleNextElement;
                      break;
                    }
                  }
                  if (latterElement) {
                    element.insertBefore(nextElement, latterElement);
                  } else {
                    element.appendChild(nextElement);
                  }
                  continue;
                }
                if (lastElement != null && nextElement != null) {
                  // replacing
                  DEBUG &&
                    console.log(
                      id,
                      `.${i} replacing`,
                      lastElement,
                      "for",
                      nextElement
                    );
                  element.replaceChild(nextElement, lastElement);
                }
              }
            }
          });

    observer.next(element);

    return () => {
      while (element.firstElementChild) {
        element.removeChild(element.firstElementChild);
      }
      if (childrenSub && !childrenSub.closed) {
        childrenSub.unsubscribe();
      }
      for (const propSub of propsSubs) {
        if (!propSub.closed) {
          propSub.unsubscribe();
        }
      }
    };
  });
}

const setupLastAndNext = scan$(
  (r: [Child[], Child[]], i: Child[]) => tuple(r[1], i),
  tuple<Child[], Child[]>([], [])
);

const flattenChildren = map$(
  ([lastChildren, nextChildren]: [Child[], Child[]]): [Chunk[], Chunk[]] => {
    const lastChunks: Chunk[] = [];
    const nextChunks: Chunk[] = [];

    for (
      let childrenIdx = 0;
      childrenIdx < Math.max(lastChildren.length, nextChildren.length);
      childrenIdx++
    ) {
      const lastChild = lastChildren[childrenIdx];
      const lastChildLength = countChunks(lastChild);
      const nextChild = nextChildren[childrenIdx];
      const nextChildLength = countChunks(nextChild);
      for (
        let childIdx = 0;
        childIdx < Math.max(lastChildLength, nextChildLength);
        childIdx++
      ) {
        lastChunks.push(getChunkAt(lastChild, childIdx));
        nextChunks.push(getChunkAt(nextChild, childIdx));
      }
    }

    return [lastChunks, nextChunks];
  }
);

function countChunks(child: Child) {
  return child == null ? 0 : child instanceof Array ? child.length : 1;
}

function getChunkAt(child: Child, childIdx: number) {
  return child == null
    ? null
    : child instanceof Array
      ? child[childIdx] || null
      : childIdx === 0
        ? child
        : null;
}

function tuple<T1, T2>(t1: T1, t2: T2): [T1, T2] {
  return [t1, t2];
}
