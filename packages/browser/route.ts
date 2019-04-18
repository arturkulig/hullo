import { Observable } from "@hullo/core/observable";
import { switchMap } from "@hullo/core/operators/switchMap";
import { of } from "@hullo/core/of";
import { LocationDescriptorObject } from "history";

export function route<T, HistoryLocationState = any>(config: {
  [id: string]: (matches: string[]) => Observable<T>;
}) {
  return function routeI(
    source: Observable<LocationDescriptorObject<HistoryLocationState>>
  ): Observable<T> {
    const routes = Object.keys(config).map(pattern => ({
      regex: new RegExp(
        /^\/.*\/$/.test(pattern) ? /^\/(.*)\/$/.exec(pattern)![1] : pattern
      ),
      response: config[pattern]
    }));
    return source.pipe(
      switchMap(location => {
        if (typeof location.pathname === "string") {
          for (const { regex, response } of routes) {
            const match = regex.exec(location.pathname);
            if (match) {
              return response(match.slice(1));
            }
          }
        }
        return of([]);
      })
    );
  };
}
