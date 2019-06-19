let nextFramePromise: null | Promise<void> = null;

export function nextFrame(
  wnd: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame"> = window
) {
  return (
    nextFramePromise ||
    (nextFramePromise = new Promise<void>(resolve => {
      wnd.requestAnimationFrame(() => {
        nextFramePromise = null;
        resolve();
      });
    }))
  );
}
