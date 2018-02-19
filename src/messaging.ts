// This creates and maintains the communication channel between
// the inspectedPage and the dev tools panel.
//
// In this example, messages are JSON objects
// {
//   action: ['code'|'script'|'message'], // What action to perform on the inspected page
//   content: [String|Path to script|Object], // data to be passed through
//   tabId: [Automatically added]
// }

export type Command = [string, {}];

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
  data: any;
  path: string[];
  commands?: Command[];
}

export type Listener = (msg: SerializedMessage) => any;

(function createChannel() {

  window.MESSAGES = [];
  window.LISTENERS = []

  let queue: SerializedMessage[] = [];

  window.FLUSH_QUEUE = () => {
    queue.forEach(msg => window.LISTENERS.forEach(processMsg(msg)));
    queue = [];
  };

  const processMsg = (msg: SerializedMessage) =>
    ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

  const backgroundPageConnection = chrome.runtime.connect({ name: 'CasiumDevToolsPanel' });

  backgroundPageConnection.onMessage.addListener((message: any) => {
    window.LISTENERS.length ? window.LISTENERS.forEach(processMsg(message)) : queue.push(message);
  });

  window.messageClient = (data) => {
    backgroundPageConnection.postMessage(Object.assign({
      from: "CasiumDevToolsPanel",
      tabId: chrome.devtools.inspectedWindow.tabId,
    }, data));
  }

  window.messageClient({ state: 'initialized' });
}());
