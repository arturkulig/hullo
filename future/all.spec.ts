import { all } from "./all";

describe("all", () => {
  it("0-length argument", () => {
    all([])(v => {
      expect(v).toEqual([]);
    });
  });

  it("1-length argument", () => {
    all([
      consume => {
        consume(1);
        return () => {};
      }
    ])(v => {
      expect(v).toEqual([1]);
    });
  });

  it("2+ length argument", done => {
    all([
      consume => {
        consume(1);
        return () => {};
      },
      consume => {
        setTimeout(() => consume(2), 100);
        return () => {};
      },
      consume => {
        setTimeout(() => consume(3), 10);
        return () => {};
      }
    ])(v => {
      try {
        expect(v).toEqual([1, 2, 3]);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
