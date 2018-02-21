import { runtime } from 'chrome';

import { SerializedMessage, Listener } from './messaging';

declare global {
  interface Window {
    PORTS: {
      [key: string]: runtime.Port
    };

    QUEUES: {
      [key: string]: typeof runtime.Port.postmessage
    };

    MESSAGES: SerializedMessage[];
    LISTENERS: Listener[][];
    FLUSH_QUEUE: () => void;
    messageClient: (data: any) => void;

    _ARCH_DEV_TOOLS_STATE: {
      contexts: {
        [id: string]: {
          container: {
            update: Map<{ name: string }, (model: {}, message?: {}, relay?: {}) => void>
          }
        }
      }
    }
  }

  // @types/chrome does not define `chrome.extension.connect()` or `chrome.extension.onConnect`
  declare namespace chrome.extension {
    declare var onConnect: typeof runtime.onConnect;
    declare var onMessage: typeof runtime.onMessage;

    export function connect(options: {}): {
      onMessage: {
        addListener(listener: (msg: any, sender: any) => void);
      },

      postMessage(options: {}, channels: string): void;
    };
  }
}
