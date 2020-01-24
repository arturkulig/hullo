import { Observer } from "./Observable";
import { Duplex } from "./Duplex";
import { Atom } from "./Atom";

type ActionDescs = { [id: string]: any };

type NowOrSometime<T> = Promise<T> | T;

interface Effect<STATE, ACTIONS extends Record<string, any>> {
  state?: STATE;
  actions?: ACTION<ACTIONS>[];
}

type Reducers<STATE, ACTIONS extends ActionDescs> = {
  [a in keyof ACTIONS]: (
    state: STATE,
    action: ACTIONS[a]
  ) => NowOrSometime<Effect<STATE, ACTIONS>>;
};

type ACTION<ACTIONS extends ActionDescs> = {
  [action in keyof ACTIONS]: {
    type: action;
    data: ACTIONS[action];
  };
}[keyof ACTIONS];

export class Redux<STATE, ACTIONS extends ActionDescs> extends Duplex<
  ACTION<ACTIONS>,
  STATE
> {
  private state$: Atom<STATE>;

  constructor(reducers: Reducers<STATE, ACTIONS>, init: STATE) {
    const state$ = new Atom<STATE>(init);
    const applier = new Reductor<STATE, ACTIONS>(reducers, state$);
    super(state$, applier);
    this.state$ = state$;
  }

  valueOf(): STATE {
    return this.state$.unwrap();
  }

  unwrap(): STATE {
    return this.state$.unwrap();
  }
}

class Reductor<STATE, ACTIONS extends ActionDescs>
  implements Observer<ACTION<ACTIONS>> {
  get closed() {
    return this.state$.closed;
  }

  constructor(
    private reducers: Reducers<STATE, ACTIONS>,
    private state$: Atom<STATE>
  ) {}

  async next(firstAction: ACTION<ACTIONS>) {
    const actions: ACTION<ACTIONS>[] = [firstAction];
    while (actions.length) {
      const action = actions.shift()!;
      await this.state$.update(async (state: STATE) => {
        if (this.reducers[action.type]) {
          const res = await this.reducers[action.type](state, action.data);
          if ("actions" in res && res.actions !== undefined) {
            actions.push(...res.actions);
          }
          if ("state" in res && res.state !== undefined) {
            return res.state;
          }
        }
        return state;
      });
    }
  }

  complete() {
    return this.state$.complete();
  }
}
