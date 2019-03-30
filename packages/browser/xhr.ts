import { Observable, IObservable } from "@hullo/core/Observable/Observable";

type Response<T extends { [id: number]: any }> = {
  [K in keyof T]: {
    status: K;
    statusText: string;
    headers: Headers;
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    formData: FormData;
    json: T[K];
    text: string;
  }
}[keyof T];

enum BodyType {
  arrayBuffer = "arrayBuffer",
  blob = "blob",
  formData = "formData",
  json = "json",
  text = "text"
}

/**
 *
 * Example:
 * fetch<{ 200: number; 404: null }>("ulala", {}, BodyType.json)
 *  .subscribe({
 *    next: v => {
 *       switch (v.status) {
 *         case 200:
 *           console.log(v.json);
 *           break;
 *         case 404:
 *           console.log(v.json);
 *           break;
 *       }
 *     }
 *   });
 */
export function fetch<T extends { [id: number]: any }>(
  options: RequestInfo,
  init: RequestInit,
  outputs: BodyType = BodyType.json
): IObservable<Response<T>> {
  return new Observable<Response<T>>(async observer => {
    const response = await window.fetch(options, init);
    const hulloResponse: Response<T> = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      ...((outputs === BodyType.arrayBuffer
        ? { arrayBuffer: await response.arrayBuffer() }
        : {
            get arrayBuffer() {
              throw new Error();
            }
          }) as any),
      ...((outputs === BodyType.blob
        ? { blob: await response.blob() }
        : {
            get blob() {
              throw new Error();
            }
          }) as any),
      ...((outputs === BodyType.formData
        ? { formData: await response.formData() }
        : {
            get formData() {
              throw new Error();
            }
          }) as any),
      ...((outputs === BodyType.json
        ? { json: await response.json() }
        : {
            get json() {
              throw new Error();
            }
          }) as any),
      ...((outputs === BodyType.text
        ? { text: await response.text() }
        : {
            get text() {
              throw new Error();
            }
          }) as any)
    };
    await observer.next(hulloResponse);
    await observer.complete();
  });
}
