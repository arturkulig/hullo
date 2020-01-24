export interface Connection {
  id: string;
  live: boolean;
  headers: { [id: string]: string[] };
}
