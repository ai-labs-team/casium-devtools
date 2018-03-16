import { groupBy, last, map, pipe, values } from 'ramda';

import { upload } from './util';

import { display } from './Notifier';
import { SerializedMessage } from './messaging';

/**
 * For a given array of Messages, return the last message for each Path
 */
export const lastMessageByPath: (messages: SerializedMessage[]) => SerializedMessage[] =
  pipe(
    groupBy<SerializedMessage>(msg => msg.path.join('.')),
    (map as any)((messages: SerializedMessage[]) => last(messages) as SerializedMessage),
    values
  )

export const importLog = () =>
  upload({ type: 'application/json' })
    .then(({ filename, content }) => {
      const messages: SerializedMessage[] = JSON.parse(content);

      // Determine the last message for each path and replay it using Time Travel
      const replay = lastMessageByPath(messages);

      if (!replay.length) {
        return display({
          type: 'warning',
          title: 'No messages to replay',
          message: `Log '${filename}' does not contain any replayable message(s)`
        });
      }

      replay.forEach(msg => window.messageClient({ selected: msg }));

      display({
        type: 'success',
        title: 'Successfully replayed message log',
        message: `Log '${filename}' contained ${replay.length} replayable message(s)`
      });
    })
    .catch(err => display({
      type: 'error',
      title: 'Failed to replay message log',
      message: 'The file that you attempted to import could not be replayed:',
      code: err.toString()
    }));
