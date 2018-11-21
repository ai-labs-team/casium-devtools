/**
 * This script is injected and executed in the context of the inspected page via
 * the Content Script. It initializes an Instrumenter backend that uses
 * `window.postMessage` to relay messages to the Content Script.
 */

import { Instrumenter } from './instrumenter';
import { fromMatches } from './util';

const isAllowedSender = fromMatches([
  'CasiumDevToolsBackgroundScript',
  'CasiumDevToolsPanel'
]);

new Instrumenter().addBackend('WebExtension', ({ connect, disconnect, send }) => {
  window.addEventListener('message', ({ data }) => {
    if (!isAllowedSender(data)) {
      return;
    }

    /**
     * Sent from the Panel UI once it is initialized, ensures that the backend
     * queue is not flushed until it is ready to receive and display messages.
     */
    if (data.state === 'initialized') {
      return connect();
    }

    /**
     * Sent from the Background Script when the Panel is closed or reloaded;
     * ensures that messages are queued until the Panel is ready again.
     */
    if (data.state === 'disconnected') {
      return disconnect();
    }

    /**
     * Forward all other messages directly to the Instrumenter
     */
    send(data);
  });

  return message => {
    window.postMessage(message, '*');
  }
});
