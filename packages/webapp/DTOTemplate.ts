export interface DTOTemplate {
  [command: string]: {
    request: any;
    response: any;
  };
}
