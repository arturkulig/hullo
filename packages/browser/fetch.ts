import { observable, Observable } from "@hullo/core/observable";

type ResponseOf<JSONType extends { [id: number]: any }> = {
  status: keyof JSONType;
  statusText: string;
  headers: Headers;
};

export { fetch$ as fetch };

function fetch$<JSONType extends { [id: number]: any } = { [id: number]: any }>(
  input: RequestInfo,
  init: RequestInit = {}
) {
  return getFetcher<JSONType, ResponseOf<JSONType>>(
    input,
    init,
    async response =>
      ({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      } as ResponseOf<JSONType>)
  );
}

export function fetchWithJSON<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init).withJSON();
}

export function fetchWithArrayBuffer<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init).withArrayBuffer();
}

export function fetchWithBlob<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init).withBlob();
}

export function fetchWithText<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init).withText();
}

export function fetchWithFormData<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init).withFormData();
}

export function fetchWithJSONAndText<
  JSONType extends { [id: number]: any } = { [id: number]: any }
>(input: RequestInfo, init: RequestInit) {
  return fetch$<JSONType>(input, init)
    .withText()
    .withJSON();
}

function getFetcher<JSONType extends { [id: number]: any }, T>(
  input: RequestInfo,
  init: RequestInit,
  process: (response: Response) => Promise<T>
): FetchExtend<JSONType, T> {
  const stream = observable<T>(observer => {
    const controller = new AbortController();
    const signal = controller.signal;
    fetch(input, { ...init, signal }).then(response =>
      process(response)
        .then(observer.next)
        .then(observer.complete)
    );
    return () => {
      controller.abort();
    };
  });

  const furtherProcessors = {
    withArrayBuffer: () =>
      getFetcher(input, init, async response => ({
        ...(await process(response)),
        arrayBuffer: await response.arrayBuffer()
      })),
    withBlob: () =>
      getFetcher(input, init, async response => ({
        ...(await process(response)),
        blob: await response.blob()
      })),
    withText: () =>
      getFetcher(input, init, async response => ({
        ...(await process(response)),
        text: await response.text()
      })),
    withFormData: () =>
      getFetcher(input, init, async response => ({
        ...(await process(response)),
        formData: await response.formData()
      })),
    withJSON: () =>
      getFetcher(input, init, async response => ({
        ...(await process(response)),
        json: await response.json()
      }))
  };
  return Object.assign(stream, furtherProcessors);
}

type FetchExtend<JSONType extends { [id: number]: any }, T> = Observable<T> & {
  withArrayBuffer(): FetchExtend<JSONType, T & { arrayBuffer: ArrayBuffer }>;
  withBlob(): FetchExtend<JSONType, T & { blob: Blob }>;
  withText(): FetchExtend<JSONType, T & { text: string }>;
  withFormData(): FetchExtend<JSONType, T & { formData: FormData }>;
  withJSON(): FetchExtend<
    JSONType,
    T &
      (Pick<T, Exclude<keyof T, "status">> &
        ({
          [status in keyof JSONType]: {
            status: status;
            json: JSONType[status];
          }
        })[keyof JSONType])
  >;
};
