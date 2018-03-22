import { INSTRUMENTER_KEY, Instrumenter } from './instrumenter';
import { Listener } from './messaging';

declare global {
  interface Window {
    PORTS: {
      [key: string]: browser.runtime.Port
    },

    QUEUES: {
      [key: string]: browser.runtime.Port['postMessage'][]
    },

    LISTENERS: Listener[][];
    messageClient: (data: any) => void;

    [INSTRUMENTER_KEY]: Instrumenter
  }
}
