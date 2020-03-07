import { WebAppLike, Responders, AppExchangeScheme } from "./types";
import { WebApp } from "./WebApp";

export function createWebApp<SessionData, Exchange extends AppExchangeScheme>(
  createSession: WebAppLike<SessionData>["createSession"],
  responders: Responders<SessionData, Exchange>
): WebAppLike<SessionData> {
  return new WebApp(createSession, responders);
}
