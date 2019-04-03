import { SerializedMessage } from './instrumenter';

export type Listener = (msg: SerializedMessage) => any;

window.LISTENERS = []

const processMsg = (msg: SerializedMessage) =>
  ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });

backgroundPageConnection.onMessage.addListener((message: any) => {
  window.LISTENERS.forEach(processMsg(message));
});

window.messageClient = (data) => {
  backgroundPageConnection.postMessage(Object.assign({
    from: "CasiumDevToolsPanel",
    tabId: browser.devtools.inspectedWindow.tabId,
  }, data));
}
