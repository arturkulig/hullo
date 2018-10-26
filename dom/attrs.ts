import { subscribe, isAsyncIterable, Subscription } from "../core";
import { ref } from "./decorate";

export function attrs(attrsDeclaration: {
  [attribute: string]:
    | string
    | boolean
    | null
    | AsyncIterable<string | boolean | null>;
}) {
  const attrsSub: Subscription[] = [];
  const modifiedAttrs = new Array<string>();

  return function applyAttrs<SomeHTMLElement extends HTMLElement = HTMLElement>(
    element$: AsyncIterable<SomeHTMLElement>
  ) {
    return ref<SomeHTMLElement>(element => {
      const ready: Array<Promise<void>> = [];

      for (const attribute in attrsDeclaration) {
        if (
          !Object.prototype.hasOwnProperty.call(attrsDeclaration, attribute)
        ) {
          continue;
        }
        const attributeValue:
          | string
          | boolean
          | null
          | AsyncIterable<string | boolean | null> =
          attrsDeclaration[attribute];
        if (isAsyncIterable<string | boolean | null>(attributeValue)) {
          ready.push(
            new Promise((resolve, reject) => {
              attrsSub.push(
                subscribe(attributeValue, {
                  next(attributeSingleValue) {
                    setAttr(
                      element,
                      attribute,
                      attributeSingleValue,
                      modifiedAttrs
                    );
                    resolve();
                  },
                  error: reject,
                  complete: reject
                })
              );
            })
          );
        } else {
          setAttr(element, attribute, attributeValue, modifiedAttrs);
        }
      }

      return Promise.all(ready).then(() => () => {
        for (const sub of attrsSub) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
        for (const modifiedAttr of modifiedAttrs) {
          element.removeAttribute(modifiedAttr);
        }
        modifiedAttrs.splice(0);
      });
    })(element$);
  };
}

function setAttr(
  element: HTMLElement,
  attribute: string,
  attributeValue: string | boolean | null,
  modifiedAttrs: string[]
) {
  if (attributeValue == null) {
    const attrIdx = modifiedAttrs.indexOf(attribute);
    if (attrIdx >= 0) {
      modifiedAttrs.splice(attrIdx, 1);
    }
    element.removeAttribute(attribute);
  } else {
    if (modifiedAttrs.indexOf(attribute) < 0) {
      modifiedAttrs.push(attribute);
    }
    if (typeof attributeValue === "boolean") {
      element.setAttribute(attribute, "");
    } else {
      element.setAttribute(attribute, attributeValue);
    }
  }
}
