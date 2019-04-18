export enum Endpoints {

  CasiumDevToolsPageScript = 'CasiumDevToolsPageScript',

  CasiumDevToolsInstrumenter = 'CasiumDevToolsInstrumenter',

  CasiumDevToolsPanel = 'CasiumDevToolsPanel',

  CasiumDevToolsBackgroundScript = 'CasiumDevToolsBackgroundScript',
}

abstract class Messenger<E> {

  protected name!: E;
  protected connection!: browser.runtime.Port | Window;

  constructor(config: { name: E, connection: browser.runtime.Port | Window }) {
    Object.assign(this, config);
  }

  abstract send(to: E, msg: {}): void;
}

export class BackgroundScript<E> extends Messenger<E> {

  constructor(config: { name: E, connection: browser.runtime.Port }) {
    super(config);
  }

  foo() {
    return this.name;
  }

  send(to: E, msg: {}) {
  }
}

export class DevToolsPanel<E> extends Messenger<E> {

  send(to: E, msg: {}) {
  }
}

export class PageScript<E> extends Messenger<E> {

  send(to: E, msg: {}) {
  }
}

export class Page<E> extends Messenger<E> {

  send(to: E, msg: {}) {
  }
}