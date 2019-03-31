import { observable } from "@hullo/core/observable";

interface PositionSuccess {
  ok: true;
  position: Position;
}

interface PositionFailure {
  ok: false;
  error: PositionError;
}

type PositionResult = PositionSuccess | PositionFailure;

export function geolocation(options: PositionOptions) {
  if ("geolocation" in navigator) {
    return observable<PositionResult>(observer => {
      const watchId = navigator.geolocation.watchPosition(
        function onGeoSuccess(position: Position) {
          observer.next({
            ok: true,
            position
          });
        },
        function onGeoError(error: PositionError) {
          observer.next({
            ok: false,
            error
          });
        },
        options
      );

      return function cancelGeo() {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  } else {
    return observable<PositionResult>(observer => {
      observer.complete();
    });
  }
}
