import { atom } from "../streams";

type Action<A extends { input: any; output: any }> = (
  input: A["input"]
) => A["output"] extends Promise<any> ? A["output"] : Promise<A["output"]>;

type Call<
  ACTIONSPROPS extends { [id: string]: { input: any; output: any } },
  K extends keyof ACTIONSPROPS
> = {
  action: K;
  input: ACTIONSPROPS[K]["input"];
  resolve: (output: ACTIONSPROPS[K]["output"]) => void;
  reject: (error: any) => void;
};

type ServerActions<
  ACTIONSPROPS extends { [id: string]: { input: any; output: any } }
> = { [id in keyof ACTIONSPROPS]: Action<ACTIONSPROPS[id]> };

export type Server<
  STATE,
  ACTIONSPROPS extends { [id: string]: { input: any; output: any } }
> = ServerActions<ACTIONSPROPS> & AsyncIterable<STATE> & { valueOf(): STATE };

type HandlerInput<HANDLER> = HANDLER extends (
  arg: infer A,
  ...args: any[]
) => any
  ? A
  : never;
type HandlerReply<HANDLER> = HANDLER extends (
  ...args: any[]
) => { reply: infer R }
  ? R
  : HANDLER extends (...args: any[]) => Promise<{ reply: infer R }> ? R : never;
type ActionPropsOfHandlers<ACTIONS> = {
  [id in keyof ACTIONS]: {
    input: HandlerInput<(ACTIONS)[id]>;
    output: HandlerReply<(ACTIONS)[id]>;
  }
};

export function server<
  STATE,
  HANDLERS extends { [id: string]: (input: any, state: STATE) => any }
>(
  initialState: STATE,
  handlers: HANDLERS
): Server<STATE, ActionPropsOfHandlers<HANDLERS>> {
  let actionExecuting = false;
  const calls: Array<
    Call<ActionPropsOfHandlers<HANDLERS>, keyof ActionPropsOfHandlers<HANDLERS>>
  > = [];
  const state$ = atom<STATE>(initialState);

  const iterable = {
    valueOf: state$.valueOf,
    [Symbol.asyncIterator]() {
      return state$[Symbol.asyncIterator]();
    }
  };

  const actions = {} as ServerActions<ActionPropsOfHandlers<HANDLERS>>;
  for (const action of Object.keys(handlers) as Array<
    keyof ActionPropsOfHandlers<HANDLERS>
  >) {
    type cActions = ActionPropsOfHandlers<HANDLERS>[typeof action];
    actions[action] = ((input: cActions["input"]) => {
      return new Promise<cActions["output"]>((resolve, reject) => {
        calls.push({
          action,
          input,
          reject,
          resolve
        });
        if (!actionExecuting) {
          execActions();
        }
      });
    }) as any;
  }

  return Object.assign(iterable, actions);

  async function execActions() {
    actionExecuting = true;
    while (calls.length) {
      const { action, input, reject, resolve } = calls.shift()!;
      try {
        const result = await handlers[action](input, state$.valueOf());
        resolve(result.reply);
        if (result.state !== undefined) {
          await state$.next(result.state);
        }
      } catch (e) {
        reject(e);
      }
    }
    actionExecuting = false;
  }
}
