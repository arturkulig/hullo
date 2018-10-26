import { subscribe, isAsyncIterable, Subscription } from "../core";
import { ref } from "./decorate";

export type Style = {
  [StyleRule in keyof CSSStyleDeclaration]?:
    | CSSStyleDeclaration[StyleRule]
    | AsyncIterable<CSSStyleDeclaration[StyleRule]>
};

export function style(styleDeclaration: Style) {
  return function applyStyle<SomeHTMLElement extends HTMLElement = HTMLElement>(
    element$: AsyncIterable<SomeHTMLElement>
  ): AsyncIterable<SomeHTMLElement> {
    const stylesSub: Subscription[] = [];

    return ref<SomeHTMLElement>(element => {
      const modifiedRules = new Array<string>();
      const ready: Array<Promise<void>> = [];

      for (const styleProp in styleDeclaration) {
        if (
          !Object.prototype.hasOwnProperty.call(styleDeclaration, styleProp)
        ) {
          continue;
        }
        const stylePropValue:
          | CSSStyleDeclaration[keyof CSSStyleDeclaration]
          | AsyncIterable<CSSStyleDeclaration[keyof CSSStyleDeclaration]> =
          styleDeclaration[styleProp];
        if (
          isAsyncIterable<CSSStyleDeclaration[keyof CSSStyleDeclaration]>(
            stylePropValue
          )
        ) {
          ready.push;
          new Promise((resolve, reject) => {
            stylesSub.push(
              subscribe(stylePropValue, {
                next(propValue) {
                  modifiedRules.push(styleProp);
                  element.style[styleProp] = propValue;
                  resolve();
                },
                error: reject,
                complete: reject
              })
            );
          });
        } else {
          modifiedRules.push(styleProp);
          element.style[styleProp] = stylePropValue;
        }
      }

      return Promise.all(ready).then(() => () => {
        for (const sub of stylesSub) {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        }
        for (const modifiedRule of modifiedRules) {
          element.style.removeProperty(modifiedRule);
        }
      });
    })(element$);
  };
}
