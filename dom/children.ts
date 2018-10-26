import { subscribe, isAsyncIterable, Subscription, atom } from "../core";
import { ref } from "./decorate";
import { combineLatest } from "../op/combineLatest";
import { scan$ } from "../op/scan";
import { map$ } from "../op/map";

const DEBUG = false;

type HTMLElementMaybe = HTMLElement | null;
type HTMLElementListMaybe = HTMLElement[] | HTMLElementMaybe;
export type Children = Array<
  AsyncIterable<HTMLElementListMaybe> | HTMLElementMaybe
>;

export function children(...childrenDeclaration: Children) {
  return function renderChildren<
    SomeHTMLElement extends HTMLElement = HTMLElement
  >(element$: AsyncIterable<SomeHTMLElement>) {
    return ref<SomeHTMLElement>(element => {
      if (childrenDeclaration.length === 0) {
        return Promise.resolve(complete);
      }

      let flatChildrenSub: Subscription | null = null;

      return new Promise<() => any>(releaseElement => {
        const flatChildren = flattenChildren(
          setupLastAndNext(
            combineLatest(
              childrenDeclaration.map(
                child => (isAsyncIterable(child) ? child : atom(child))
              )
            )
          )
        );

        flatChildrenSub = subscribe(flatChildren, {
          next([lastElements, nextElements]: [
            HTMLElementMaybe[],
            HTMLElementMaybe[]
          ]) {
            const length = Math.max(lastElements.length, nextElements.length);

            for (let i = 0; i < length; i++) {
              const lastElement = lastElements[i] || null;
              const nextElement = nextElements[i] || null;

              if (lastElement === nextElement) {
                // same element
                DEBUG &&
                  console.log(element.tagName, element, { lastElement }, "==", {
                    nextElement
                  });
              } else if (lastElement == null && nextElement == null) {
                // both empty
                DEBUG &&
                  console.log(
                    element.tagName,
                    element,
                    { lastElement },
                    "== null"
                  );
              } else if (lastElement != null && nextElement == null) {
                // removing
                DEBUG &&
                  console.log(element.tagName, element, { lastElement }, "🗑");
                element.removeChild(lastElement);
              } else if (lastElement == null && nextElement != null) {
                // adding
                DEBUG &&
                  console.log(element.tagName, element, `➕`, nextElement);
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
                    element.tagName,
                    element,
                    `.${i}`,
                    lastElement,
                    "=>",
                    nextElement
                  );
                element.replaceChild(nextElement, lastElement);
              }
            }

            releaseElement(complete);
          }
        });
      });

      function complete() {
        if (flatChildrenSub != null && !flatChildrenSub.closed) {
          flatChildrenSub.unsubscribe();
          element.childNodes.forEach(child => element.removeChild(child));
        }
      }
    })(element$);
  };
}

const setupLastAndNext = scan$(
  (
    r: [HTMLElementListMaybe[], HTMLElementListMaybe[]],
    i: HTMLElementListMaybe[]
  ) => tuple(r[1], i),
  tuple<HTMLElementListMaybe[], HTMLElementListMaybe[]>([], [])
);

const flattenChildren = map$(
  ([lastChildren, nextChildren]: [
    HTMLElementListMaybe[],
    HTMLElementListMaybe[]
  ]): [HTMLElementMaybe[], HTMLElementMaybe[]] => {
    const lastChunks: HTMLElementMaybe[] = [];
    const nextChunks: HTMLElementMaybe[] = [];

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

function countChunks(child: HTMLElementListMaybe) {
  return child == null ? 0 : child instanceof Array ? child.length : 1;
}

function getChunkAt(child: HTMLElementListMaybe, childIdx: number) {
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
