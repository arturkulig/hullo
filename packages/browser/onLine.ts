import { observable } from "@hullo/core/observable";

export function onLine() {
  return observable<boolean>(observer => {
    observer.next(window.navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return cancel;

    function cancel() {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    }

    function handleOffline() {
      observer.next(false);
    }

    function handleOnline() {
      observer.next(true);
    }
  });
}
