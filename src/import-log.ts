import { last } from 'ramda';

import { upload } from './util';
import { display } from './Notifier';
import { SerializedMessage } from './messaging';

/**
 * 'Replays' a message log by using the 'time travel' feature to set the
 * application state to the last message found in a JSON message log file.
 */
export const importLog = () =>
  upload({ type: 'application/json' })
    .then(({ filename, content }) => {
      const messages: SerializedMessage[] = JSON.parse(content);

      // Determine the last message for each path and replay it using Time Travel
      const toReplay = last(messages);

      if (!toReplay) {
        return display({
          type: 'warning',
          title: 'No messages to replay',
          message: `Log '${filename}' does not contain any replayable message(s)`
        });
      }

      window.messageClient({ selected: toReplay });

      display({
        type: 'success',
        title: 'Successfully replayed message log',
        message: `Application state now matches the last message recorded in log '${filename}'`
      });
    })
    .catch(err => display({
      type: 'error',
      title: 'Failed to replay message log',
      message: 'The file that you attempted to import could not be replayed:',
      code: err.toString()
    }));
