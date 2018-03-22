import { onMessage, withStateManager, OnMessageCallback, StateManagerCallback } from 'casium/instrumentation';
import { safeStringify, safeParse } from 'casium/util';
import { GenericObject } from 'casium/core';
import StateManager from 'casium/runtime/state_manager';
import ExecContext, { cmdName } from 'casium/runtime/exec_context';
import { filter, flatten, is, map, pipe } from 'ramda';

export const INSTRUMENTER_KEY = '__CASIUM_DEV_TOOLS_INSTRUMENTER__';

export interface Backend {
  connected: boolean;
  onMessage: (msg: SerializedMessage) => void;
  queue: SerializedMessage[];
}

type ConnectionControl = {
  connect: () => void;
  disconnect: () => void;
  send: (msg: any) => void;
}

export type SerializedCommand = [string, GenericObject];

export interface SerializedMessage {
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

const serialize = map<GenericObject, GenericObject>(pipe(safeStringify, safeParse)) as any;

const serializeCmds: (cmds: any[]) => SerializedCommand[] =
  pipe(flatten as any, filter(is(Object)), map<any, SerializedCommand[]>(cmd => [cmdName(cmd), cmd.data]));

/**
 * The DevTools Instrumenter runs in the same context as the Inspected Page, and
 * provides a pluggable 'backend' mechanism to allow multiple DevTools instances
 * to connect simultaneously.
 *
 * This class acts as a Singleton; upon construction, it searches for an
 * existing instance at `window[INSTRUMENTER_KEY]` and returns it if it already
 * exists. Otherwise, a new instance is created and stored there.
 */
export class Instrumenter {
  public stateManager?: StateManager;

  public contexts: { [id: string]: ExecContext<any> } = {};

  protected _backends: { [name: string]: Backend } = {};

  protected _session = Date.now() + Math.random().toString(36).substr(2);

  protected _messageCounter = 0;

  constructor() {
    if (window[INSTRUMENTER_KEY]) {
      return window[INSTRUMENTER_KEY];
    }

    window[INSTRUMENTER_KEY] = this;
    onMessage(this._instrumenterFn);
    withStateManager(this._setRoot);
  }

  protected _instrumenterFn: OnMessageCallback = ({ context, msg, prev, next, path, cmds }) => {
    const name = context.container && context.container.name || '{Anonymous Container}';

    const serialized: SerializedMessage = serialize({
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

    for (const name in this._backends) {
      const { connected, queue, onMessage } = this._backends[name];
      connected ? onMessage(serialized) : queue.push(serialized);
    }
  };

  protected _setRoot: StateManagerCallback = stateManager => {
    this.stateManager = stateManager;
  }

  protected _nextId() {
    return ++this._messageCounter;
  }

  public addBackend(name: string, control: (control: ConnectionControl) => void, onMessage: (message: SerializedMessage) => void) {
    const backend = {
      connected: false,
      queue: [],
      onMessage
    };

    control({
      connect: () => {
        backend.connected = true;
        backend.queue.forEach(onMessage);
        backend.queue = [];
      },

      disconnect: () => backend.connected = false,
      send: () => { }
    });

    this._backends[name] = backend;
  }
}
