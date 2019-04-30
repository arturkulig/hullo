import { Observable, ComplexProducer, Observer } from "@hullo/core/observable";

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

function getFetcher<JSONType extends { [id: number]: any }, RES>(
  input: RequestInfo,
  init: RequestInit,
  process: (response: Response) => Promise<RES>
): FetchExtend<JSONType, RES> {
  const stream = new Observable<RES>(
    new FetchProducer<RES>(input, init, process)
  );

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

class FetchProducer<RES> implements ComplexProducer<RES> {
  constructor(
    private input: RequestInfo,
    private init: RequestInit,
    private process: (response: Response) => Promise<RES>
  ) {}

  subscribe(observer: Observer<RES>) {
    const controller = new AbortController();
    const signal = controller.signal;
    fetch(this.input, { ...this.init, signal }).then(response =>
      this.process(response)
        .then(observer.next.bind(observer))
        .then(observer.complete.bind(observer))
    );
    return new FetchCancel(controller);
  }
}

class FetchCancel {
  constructor(private controller: AbortController) {}

  cancel() {
    this.controller.abort();
  }
}

type FetchExtend<JSONType extends { [id: number]: any }, RES> = Observable<
  RES
> & {
  withArrayBuffer(): FetchExtend<JSONType, RES & { arrayBuffer: ArrayBuffer }>;
  withBlob(): FetchExtend<JSONType, RES & { blob: Blob }>;
  withText(): FetchExtend<JSONType, RES & { text: string }>;
  withFormData(): FetchExtend<JSONType, RES & { formData: FormData }>;
  withJSON(): FetchExtend<
    JSONType,
    RES &
      (Pick<RES, Exclude<keyof RES, "status">> &
        ({
          [status in keyof JSONType]: {
            status: status;
            json: JSONType[status];
          }
        })[keyof JSONType])
  >;
};
