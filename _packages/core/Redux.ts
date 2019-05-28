import { Observer } from "./Observable";
import { Duplex } from "./Duplex";
import { Atom } from "./Atom";

type Reducers<STATE, ACTIONS> = {
  [a in keyof ACTIONS]: (
    state: STATE,
    action: ACTIONS[a]
  ) => Promise<STATE> | STATE
};

type ACTION<ACTIONS> = {
  [action in keyof ACTIONS]: {
    type: action;
    data: ACTIONS[action];
  }
}[keyof ACTIONS];

export class Redux<STATE, ACTIONS extends { [id: string]: any }> extends Duplex<
  ACTION<ACTIONS>,
  STATE
> {
  private state$: Atom<STATE>;

  constructor(reducers: Reducers<STATE, ACTIONS>, init: STATE) {
    const state$ = new Atom(init);
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

class Reductor<STATE, ACTIONS> implements Observer<ACTION<ACTIONS>> {
  get closed() {
    return this.state$.closed;
  }

  constructor(
    private reducers: Reducers<STATE, ACTIONS>,
    private state$: Atom<STATE>
  ) {}

  next(action: ACTION<ACTIONS>) {
    return this.state$.update(state =>
      this.reducers[action.type]
        ? this.reducers[action.type](state, action.data)
        : state
    );
  }

  complete() {
    return this.state$.complete();
  }
}
