import { observable } from "@hullo/core/observable";

export function pageVisibility() {
  return observable<VisibilityState>(observer => {
    observer.next(document.visibilityState);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
      false
    );

    return cancel;

    function cancel() {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
        false
      );
    }

    function handleVisibilityChange() {
      observer.next(document.visibilityState);
    }
  });
}
