import { SessionManagerConfig } from "./SessionManager";
import { RespondersTemplate, Responders } from "./Responders";

export interface AppConfig<Session, Template extends RespondersTemplate> {
  appName: string;
  sessionConfig: SessionManagerConfig<Session>;
  responder: Responders<Session, Template>;
}
