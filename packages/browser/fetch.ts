import { Observable, ComplexProducer, Observer } from "@hullo/core/Observable";

type ResponseOf = {
  status: number;
  statusText: string;
  headers: Headers;
};

export { fetch$ as fetch };

function fetch$(request: Request) {
  return getFetcher(
    request,
    async response =>
      ({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      } as ResponseOf)
  );
}

export function fetchWithJSON(request: Request) {
  return fetch$(request).withJSON();
}

export function fetchWithArrayBuffer(request: Request) {
  return fetch$(request).withArrayBuffer();
}

export function fetchWithBlob(request: Request) {
  return fetch$(request).withBlob();
}

export function fetchWithText(request: Request) {
  return fetch$(request).withText();
}

export function fetchWithFormData(request: Request) {
  return fetch$(request).withFormData();
}

export function fetchWithJSONAndText(request: Request) {
  return fetch$(request)
    .withText()
    .withJSON();
}

function getFetcher<RES>(
  request: Request,
  process: (response: Response) => Promise<RES>
): FetchExtend<RES> {
  const stream = new Observable<RES>(new FetchProducer<RES>(request, process));

  const furtherProcessors = {
    withArrayBuffer: () =>
      getFetcher(request, async response => ({
        ...(await process(response)),
        arrayBuffer: await response.arrayBuffer()
      })),
    withBlob: () =>
      getFetcher(request, async response => ({
        ...(await process(response)),
        blob: await response.blob()
      })),
    withText: () =>
      getFetcher(request, async response => ({
        ...(await process(response)),
        text: await response.text()
      })),
    withFormData: () =>
      getFetcher(request, async response => ({
        ...(await process(response)),
        formData: await response.formData()
      })),
    withJSON: () =>
      getFetcher(request, async response => ({
        ...(await process(response)),
        json: await response.json()
      }))
  };
  return Object.assign(stream, furtherProcessors);
}

class FetchProducer<RES> implements ComplexProducer<RES> {
  constructor(
    private request: Request,
    private process: (response: Response) => Promise<RES>
  ) {}

  subscribe(observer: Observer<RES>) {
    const controller = new AbortController();
    const signal = controller.signal;
    fetch(this.request, { signal }).then(response =>
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

type FetchExtend<RES> = Observable<RES> & {
  withArrayBuffer(): FetchExtend<RES & { arrayBuffer: ArrayBuffer }>;
  withBlob(): FetchExtend<RES & { blob: Blob }>;
  withText(): FetchExtend<RES & { text: string }>;
  withFormData(): FetchExtend<RES & { formData: FormData }>;
  withJSON(): FetchExtend<
    RES & {
      status: number;
      json: unknown;
    }
  >;
};
