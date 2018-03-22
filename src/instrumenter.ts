import { onMessage, withStateManager, OnMessageCallback, StateManagerCallback } from 'casium/instrumentation';
import { safeStringify, safeParse } from 'casium/util';
import { GenericObject } from 'casium/core';
import StateManager from 'casium/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/runtime/exec_context';
import { filter, flatten, is, lensPath, map, pipe, set } from 'ramda';

export const INSTRUMENTER_KEY = '__CASIUM_DEV_TOOLS_INSTRUMENTER__';

/**
 * Used to retain the connectivity state and pending message queue for multiple
 * Backends
 */
export type BackendState = {
  connected: boolean;
  onMessage: (msg: SerializedMessage) => void;
  queue: SerializedMessage[];
}

/**
 * A Backend defines the in- and out-bound behaviour for interacting with the
 * DevTools instrumenter. A Backend is defined as a function which accepts a
 * `spec` object. This Spec contains the `connect`, `disconnect` and `send`
 * functions, which allows the Backend to update its connectivity state stored
 * within the Instrumenter.
 *
 * The Backend should return a function which will be called with a serialized
 * form of a Message on every dispatch.
 */
export type Backend = (spec: {
  connect: () => void;
  disconnect: () => void;
  send: (msg: any) => void;
}) => (msg: SerializedMessage) => void;

export type SerializedCommand = [string, GenericObject];

export type SerializedMessage = {
  id: string;
  name: string;
  context: string;
  ts: number;
  prev: any;
  next: any;
  from: string;
  relay: any;
  message: string;
  data: {} | null;
  path: string[];
  commands?: SerializedCommand[];
}

export type InboundMessage = {
  selected: SerializedMessage
}

const serialize = map<GenericObject, GenericObject>(pipe(safeStringify, safeParse)) as any;

const serializeCmds: (cmds: any[]) => SerializedCommand[] =
  pipe(flatten as any, filter(is(Object)), map<any, SerializedCommand[]>(cmd => [cmdName(cmd), cmd.data]));

/**
 * The DevTools Instrumenter runs in the same context as the Inspected Page, and
 * provides a pluggable 'backend' mechanism to allow multiple DevTools instances
 * to connect simultaneously.
 */
export class Instrumenter {
  public stateManager?: StateManager;

  public contexts: { [id: string]: ExecContext<any> } = {};

  protected _backendStates: { [name: string]: BackendState } = {};

  protected _session = Date.now() + Math.random().toString(36).substr(2);

  protected _messageCounter = 0;

  /**
  * This class acts as a Singleton; upon construction, it searches for an
  * existing instance at `window[INSTRUMENTER_KEY]` and returns it if it already
  * exists. Otherwise, a new instance is created and stored there.
  *
  * Uses the Instrumentation API to register an `onMessage` and
  * `withStateManager` handler.
  */
  constructor() {
    if (window[INSTRUMENTER_KEY]) {
      return window[INSTRUMENTER_KEY];
    }

    window[INSTRUMENTER_KEY] = this;
    onMessage(this._instrumenterFn);
    withStateManager(this._setRoot);
  }

  /**
   * Whenever a Message is dispatched by Casium, turn it into a serializable
   * form and send it to all connected backends.
   */
  protected _instrumenterFn: OnMessageCallback = ({ context, msg, prev, next, path, cmds }) => {
    const name = context.container && context.container.name || '{Anonymous Container}';

    const serialized: SerializedMessage = serialize({
      from: 'CasiumDevToolsInstrumenter',
      context: context.id,
      id: this._session + this._nextId(),
      ts: Date.now(),
      relay: context.relay(),
      message: msg && msg.constructor && msg.constructor.name || `Init (${name})`,
      data: msg && msg.data,
      commands: serializeCmds(cmds),
      name,
      prev,
      next,
      path,
    });

    this.contexts[context.id] = context;

    for (const name in this._backendStates) {
      const { connected, queue, onMessage } = this._backendStates[name];
      connected ? onMessage(serialized) : queue.push(serialized);
    }
  };

  /**
   * Stores the root State Manager once the inspected page has initialized
   */
  protected _setRoot: StateManagerCallback = stateManager => {
    this.stateManager = stateManager;
  }

  protected _nextId() {
    return ++this._messageCounter;
  }

  /**
   * Registers a Backend against the Instrumenter. By default, the backend will
   * be set to the `disconnected` state; the implementer must explcitly maintain
   * connection state using `connect()` and `disconnect()`.
   *
   * Once the Backend has been registered a `{state: initialized}` message is
   * emitted, which may be used for ensuring that downstream components are also
   * initialized once the Instrumenter and Backend are ready.
   */
  public addBackend(name: string, backend: Backend) {
    const onMessage = backend({
      connect: () => {
        state.connected = true;
        state.queue.forEach(onMessage);
        state.queue = [];
      },

      disconnect: () => state.connected = false,

      send: (msg: InboundMessage) => {
        if (msg.selected) {
          const sel = msg.selected;
          const newState = set(lensPath(sel.path), sel.next, sel.prev);
          return withStateManager(stateManager => stateManager.set(newState));
        }
      }
    });

    const state = {
      connected: false,
      queue: [],
      onMessage
    };

    this._backendStates[name] = state;

    onMessage({
      from: 'CasiumDevToolsInstrumenter',
      state: 'initialized'
    } as any);
  }
}
