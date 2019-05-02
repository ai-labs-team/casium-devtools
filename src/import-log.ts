import { applyDeltas, upload } from './util';
import { display } from './Notifier';

/**
 * 'Replays' a message log by using the 'time travel' feature to set the
 * application state to the last message found in a JSON message log file.
 */
export const importLog = () =>
  upload({ type: 'application/json' })
    .then(({ filename, content }) => {
      const log: any = JSON.parse(content);

      if (log.version === '1') {
        const { initial, messages } = log;
        const setState = applyDeltas(initial, messages);

        window.messageClient({ setState });

        display({
          type: 'success',
          title: 'Successfully replayed message log',
          message: `Application state now matches the last message recorded in log '${filename}'`
        });

        return { initial, messages };
      }

      throw new Error('Unknown Message Log format/version');
    })
    .catch(err => {
      display({
        type: 'error',
        title: 'Failed to replay message log',
        message: 'The file that you attempted to import could not be replayed:',
        code: err.toString()
      });

      throw err;
    });
