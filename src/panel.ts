import { SerializedMessage } from './instrumenter';

export type Listener = (msg: SerializedMessage) => any;

window.LISTENERS = [];

const processMsg = (msg: SerializedMessage) =>
  ([predicate, ...listeners]: Listener[]) => predicate(msg) && listeners.map(l => l(msg));

const backgroundPageConnection = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPanel' });

backgroundPageConnection.onMessage.addListener((message: any) => {
  console.log("Msg from bg page", message);
  window.LISTENERS.forEach(processMsg(message));
});

window.messageClient = (data) => {
  backgroundPageConnection.postMessage(Object.assign({
    from: 'CasiumDevToolsPanel',
    tabId: browser.devtools.inspectedWindow.tabId,
  }, data));
}

import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from './App';
import { Notifier } from './Notifier';

render(createElement(App), document.getElementById('app'));
render(createElement(Notifier), document.getElementById('notifier'));
