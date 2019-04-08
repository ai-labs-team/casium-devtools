/**
 * This script is injected and executed in the context of the inspected page via
 * the Content Script. It initializes an Instrumenter backend that uses
 * `window.postMessage` to relay messages to the Content Script.
 */
import { complement as not, cond, pipe, prop, propEq, always } from 'ramda'
import { Instrumenter } from './instrumenter';
import { fromMatches } from './util';

const isAllowedSender = fromMatches([
  'CasiumDevToolsBackgroundScript',
  'CasiumDevToolsPanel'
]);

new Instrumenter().addBackend('WebExtension', ({ connect, disconnect, send }) => {
  window.addEventListener('message', pipe(prop('data'), cond([

    [(data) => {
      console.log('Message received by injected script', data);
      return false;
    }, () => {}],

    [not(isAllowedSender), () => {}],

    /**
     * Sent from the Panel UI once it is initialized, ensures that the backend
     * queue is not flushed until it is ready to receive and display messages.
     */
    [propEq('state', 'initialized'), connect],

    /**
     * Sent from the Background Script when the Panel is closed or reloaded;
     * ensures that messages are queued until the Panel is ready again.
     */
    [propEq('state', 'disconnected'), disconnect],

    /**
     * Forward all other messages directly to the Instrumenter
     */
    [always(true), send]
  ])));

  return message => {
    window.postMessage(message, '*');
  }
});
