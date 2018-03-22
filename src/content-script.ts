import { fromMatches } from './util';

/**
 * Inject a Script into the inspected window containing an Instrumenter
 * configured to use the `postMessage` client.
 */
const clientScript = document.createElement('script');
clientScript.src = browser.extension.getURL('injected-script.js');
(document.head || document.documentElement).appendChild(clientScript);

const isAllowedPortSender = fromMatches(['CasiumDevToolsPanel']);
const isAllowedPostMessageSender = fromMatches(['CasiumDevToolsInstrumenter']);

const port = browser.runtime.connect(undefined, { name: 'CasiumDevToolsPageScript' });

/**
 * Relay messages from the Background Script to the Client via
 * `window.postMessage`.
 */
port.onMessage.addListener(msg => {
  isAllowedPortSender(msg) && window.postMessage(msg, '*');
});

/**
 * Relay messages from the Client via `port.postMessage`
 */
window.addEventListener('message', ({ data }) => {
  isAllowedPostMessageSender(data) && port.postMessage(data);
});
