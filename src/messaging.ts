import { SerializedMessage } from './instrumenter';

// This creates and maintains the communication channel between
// the inspectedPage and the dev tools panel.
//
// In this example, messages are JSON objects
// {
//   action: ['code'|'script'|'message'], // What action to perform on the inspected page
//   content: [String|Path to script|Object], // data to be passed through
//   tabId: [Automatically added]
// }

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
