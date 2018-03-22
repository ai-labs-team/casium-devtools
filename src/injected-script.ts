/**
 * This script is injected and executed in the context of the inspected page via
 * the Content Script. It initializes an Instrumenter backend that uses
 * `window.postMessage` to relay messages to the Content Script.
 */

import { Instrumenter } from './instrumenter';
import { fromMatches } from './util';

const isAllowedSender = fromMatches([
  'CasiumDevToolsPageScript',
  'CasiumDevToolsPanel'
]);

new Instrumenter().addBackend('WebExtension', ({ connect, disconnect, send }) => {
  window.addEventListener('message', ({ data }) => {
    if (!isAllowedSender(data)) {
      return;
    }

    if (data.state === 'initialized') {
      connect();
    }
  })
}, message => {
  window.postMessage({
    ...message,
    from: 'CasiumDevToolsInstrumenter'
  }, '*');
})
