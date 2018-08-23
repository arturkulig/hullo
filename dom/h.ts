import {
  observable,
  atom,
  AsyncObserver,
  subscribe,
  Subscription,
  isAsyncIterable
} from "../core";
import { combineLatest } from "../op/combineLatest";
import { scan$ } from "../op/scan";
import { map$ } from "../op/map";

type Chunk = HTMLElement | null;
type Child = HTMLElement[] | Chunk;

export type Props<E extends object> = {
  [K in keyof E]?: K extends "style"
    ? { [RULE in keyof E[K]]?: E[K][RULE] | AsyncIterable<E[K][RULE]> }
    : E[K] extends ((event: infer EVENT) => any)
      ? (E[K] | AsyncObserver<EVENT>)
      : (E[K] | AsyncIterable<E[K]>)
};

let lastID = 0;
const DEBUG = false;

export function h<TAG extends keyof ElementTagNameMap>(
  tagName: TAG,
  props: Props<ElementTagNameMap[TAG]> = {},
  ...children: Array<
    AsyncIterable<HTMLElement[] | HTMLElement | null> | HTMLElement
  >
) {
  return observable<HTMLElement>(observer => {
    const element = document.createElement(tagName);
    const id = (lastID++).toString();

    DEBUG && console.log(id, "creating");

    const subs: Subscription[] = [];
    const readyConditions: Promise<any>[] = [];

    for (const p in props) {
      if (p === "style" && props[p]) {
        const style = props[p]!;

        for (const ruleName in style) {
          const rule = (style as any)[ruleName];
          if (rule && isAsyncIterable(rule)) {
            readyConditions.push(
              new Promise(ready => {
                subs.push(
                  subscribe(rule, {
                    next(ruleValue) {
                      DEBUG && console.log(id, `.style.${ruleName}\$`, rule);
                      element.style[ruleName as any] = ruleValue;
                      ready();
                    }
                  })
                );
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
          readyConditions.push(
            new Promise(ready => {
              subs.push(
                subscribe(staticProp, {
                  next(dynamicProp) {
                    DEBUG && console.log(id, `.${p}\$`, dynamicProp);
                    (element as any)[p] = dynamicProp;
                    ready();
                  }
                })
              );
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

    if (children.length) {
      const flatChildren = flattenChildren(
        setupLastAndNext(
          combineLatest(
            children.map(
              child => (isAsyncIterable(child) ? child : atom(child))
            )
          )
        )
      );

      readyConditions.push(
        new Promise(ready => {
          subs.push(
            subscribe(flatChildren, {
              async next([lastElements, nextElements]: [Chunk[], Chunk[]]) {
                DEBUG &&
                  console.log(
                    id,
                    "diff",
                    lastElements.map(e => (e ? e.dataset.id : "null")),
                    nextElements.map(e => (e ? e.dataset.id : "null"))
                  );

                const length = Math.max(
                  lastElements.length,
                  nextElements.length
                );

                for (let i = 0; i < length; i++) {
                  const lastElement = lastElements[i] || null;
                  const nextElement = nextElements[i] || null;

                  if (lastElement === nextElement) {
                    // same element
                    DEBUG && console.log(id, `.${i}`, "same");
                  } else if (lastElement == null && nextElement == null) {
                    // both empty
                    DEBUG && console.log(id, `.${i}`, "same,null");
                  } else if (lastElement != null && nextElement == null) {
                    // removing
                    DEBUG && console.log(id, `.${i} removing`, lastElement);
                    element.removeChild(lastElement);
                  } else if (lastElement == null && nextElement != null) {
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
                  } else if (lastElement != null && nextElement != null) {
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
                ready();
              }
            })
          );
        })
      );
    }

    Promise.all(readyConditions).then(() => observer.next(element));

    return () => {
      while (element.firstElementChild) {
        element.removeChild(element.firstElementChild);
      }
      for (const propSub of subs) {
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
