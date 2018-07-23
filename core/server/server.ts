import { atom } from "../streams";

type Handler<
  STATE,
  INS extends object,
  OUTS extends { [id in keyof INS]: any },
  K extends keyof INS
> = (
  input: INS[K],
  state: STATE
) => HandlerResult<STATE, OUTS, K> | Promise<HandlerResult<STATE, OUTS, K>>;
type HandlerResult<STATE, OUTS extends object, K extends keyof OUTS> = {
  state?: STATE;
  reply: OUTS[K];
};

type Action<
  INS extends object,
  OUTS extends { [id in keyof INS]: any },
  K extends keyof INS
> = (
  input: INS[K]
) => OUTS[K] extends Promise<any> ? OUTS[K] : Promise<OUTS[K]>;

type Call<
  INS extends object,
  OUTS extends { [id in keyof INS]: any },
  K extends keyof INS
> = {
  action: K;
  input: INS[K];
  resolve: (output: OUTS[K]) => void;
  reject: (error: any) => void;
};

type ServerActions<
  INS extends object,
  OUTS extends { [id in keyof INS]: any }
> = { [id in keyof INS]: Action<INS, OUTS, id> };

export type Server<
  STATE,
  INS extends object,
  OUTS extends { [id in keyof INS]: any }
> = ServerActions<INS, OUTS> & AsyncIterable<STATE> & { valueOf(): STATE };

export function server<
  STATE,
  INS extends object,
  OUTS extends { [id in keyof INS]: any }
>(
  initialState: STATE,
  handlers: { [id in keyof INS]: Handler<STATE, INS, OUTS, id> }
): Server<STATE, INS, OUTS> {
  let actionExecuting = false;
  const calls: Array<Call<INS, OUTS, keyof INS>> = [];
  const state$ = atom<STATE>(initialState);

  const iterable = {
    valueOf: state$.valueOf,
    [Symbol.asyncIterator]() {
      return state$[Symbol.asyncIterator]();
    }
  };

  const actions = {} as ServerActions<INS, OUTS>;
  for (const action of Object.keys(handlers) as Array<keyof INS>) {
    actions[action] = (input: INS[typeof action]) => {
      return new Promise<OUTS[typeof action]>((resolve, reject) => {
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
    };
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
