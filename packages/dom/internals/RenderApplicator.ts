export interface RenderApplicator<T> {
  process(value: T): void;
  // clean?(): void;
}
