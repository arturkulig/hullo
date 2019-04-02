import { duplex } from "@hullo/core/duplex";
import { observable } from "@hullo/core/observable";

export function location() {
  return duplex(
    observable<Location>(observer => {
      window.addEventListener("popstate", handleLocationChange);
      window.addEventListener("pushstate", handleLocationChange);

      return cancel;

      function cancel() {
        window.removeEventListener("popstate", handleLocationChange);
        window.removeEventListener("pushstate", handleLocationChange);
      }

      function handleLocationChange() {
        observer.next(window.location);
      }
    }),
    {
      next: (href: string) => {
        window.history.pushState({}, "", href);
        const event = new Event("pushstate");
        window.dispatchEvent(new Event("pushstate"));
        if (event.defaultPrevented) {
          window.history.back();
        }
        return Promise.resolve();
      },
      complete: () => {
        return Promise.resolve();
      }
    }
  );
}
