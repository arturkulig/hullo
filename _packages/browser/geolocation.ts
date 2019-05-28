import {
  Observable,
  ComplexProducer,
  Observer,
  Cancellation
} from "@hullo/core/Observable";

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
  return new Observable<PositionResult>(
    typeof navigator === "object" && "geolocation" in navigator
      ? new PositionProducer(options)
      : observer => {
          observer.complete();
        }
  );
}

class PositionProducer implements ComplexProducer<PositionResult> {
  constructor(private options: PositionOptions) {}

  subscribe(observer: Observer<PositionResult>) {
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
      this.options
    );

    return new GeolocationCancel(watchId);
  }
}

class GeolocationCancel implements Cancellation {
  constructor(private watchId: number) {}

  cancel() {
    navigator.geolocation.clearWatch(this.watchId);
  }
}
