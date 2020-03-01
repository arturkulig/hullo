import { fetch } from "./fetch";

(global as any).window = {};

describe("fetch", () => {
  it("types test", done => {
    (global as any).AbortController = class AbortController {
      signal = {};
      abort() {}
    };
    (global as any).fetch = () =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ ok: true }),
        text: () => Promise.resolve('{ "ok": true }')
      });

    fetch(new Request("ulala"))
      .withJSON()
      .withText()
      .subscribe({
        next: v => {
          switch (v.status) {
            case 200:
              expect((v.json as any).ok).toBe(true);
              expect(v.text).toBe('{ "ok": true }');
              expect("blob" in v).toBe(false);
              done();
              break;

            default:
              done(new Error("Response should be of status HTTP 200"));
          }
        }
      });
  });
});
