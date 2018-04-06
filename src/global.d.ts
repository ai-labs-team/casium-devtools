import { INSTRUMENTER_KEY, Instrumenter } from './instrumenter';
import { Listener } from './messaging';

declare global {
  interface Window {
    LISTENERS: Listener[][];
    messageClient: (data: any) => void;

    [INSTRUMENTER_KEY]: Instrumenter
  }
}
