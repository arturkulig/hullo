let resolveWhenPainted: null | ((v: void) => any) = null;
let nextFramePromise: null | Promise<void> = null;

export const nextFrame: () => Promise<void> =
  typeof window === "undefined" || !("requestAnimationFrame" in window)
    ? function getTimeoutPromise() {
        return (
          nextFramePromise ||
          (nextFramePromise = new Promise<void>(nextFrameTimeoutResolver))
        );
      }
    : function getNextFramePromise() {
        return (
          nextFramePromise ||
          (nextFramePromise = new Promise<void>(nextFrameRafResolver))
        );
      };

function nextFrameTimeoutResolver(resolve: (v: void) => any) {
  setTimeout(flushWhenPaintedCbs, 0);
  resolveWhenPainted = resolve;
}

function nextFrameRafResolver(resolve: (v: void) => any) {
  window.requestAnimationFrame(flushWhenPaintedCbs);
  resolveWhenPainted = resolve;
}

function flushWhenPaintedCbs() {
  nextFramePromise = null;
  if (resolveWhenPainted) {
    const _nextFrameConsumer = resolveWhenPainted;
    resolveWhenPainted = null;
    _nextFrameConsumer();
  }
}
