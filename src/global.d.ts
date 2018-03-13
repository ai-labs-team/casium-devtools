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
          path: string[],
          container: {
            update: Map<{ name: string }, (model: {}, message?: {}, relay?: {}) => void>
          }
        }
      }
    }
  }
}
