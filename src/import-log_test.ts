import { expect } from 'chai';
import * as sinon from 'sinon';

import * as importLog from './import-log';
import * as util from './util';
import * as notifier from './Notifier';

declare var global: {
  window: {
    messageClient: sinon.SinonSpy
  }
}

const messages = [{
  path: [],
  prev: {},
  next: {
    counter: { value: 0 },
    message: { title: '' }
  }
}, {
  path: ['counter'],
  prev: {
    counter: { value: 0 },
    message: { title: '' }
  },
  next: { value: 10 }
}, {
  path: ['message'],
  prev: {
    counter: { value: 10 },
    message: { title: '' }
  },
  next: { title: 'hello' }
}, {
  path: ['counter'],
  prev: {
    counter: { value: 10 },
    message: { title: 'hello' }
  },
  next: { value: 9 }
}, {
  path: ['message'],
  prev: {
    counter: { value: 9 },
    message: { title: 'hello' }
  },
  next: { title: 'goodbye' }
}];

describe('importLog', () => {
  before(() => {
    sinon.stub(util, 'upload');
    sinon.stub(notifier, 'display');
  });

  afterEach(() => {
    (util.upload as sinon.SinonStub).reset();
    (notifier.display as sinon.SinonStub).reset();
  });

  it('uses time travel to replay the last message in the log', done => {
    global.window.messageClient = sinon.spy();

    importLog.importLog(Promise.resolve({
      filename: 'messages.json',
      content: JSON.stringify(messages)
    }));

    setImmediate(() => {
      expect(global.window.messageClient.args).to.deep.equal([
        [{
          selected: messages[4]
        }]
      ]);

      expect((notifier.display as sinon.SinonStub).args).to.deep.equal([
        [{
          type: 'success',
          title: 'Successfully replayed message log',
          message: `Application state now matches the last message recorded in log 'messages.json'`
        }]
      ]);

      done();
    })
  });

  describe('when importing a non-JSON file', () => {
    it('displays an error message', done => {
      importLog.importLog(Promise.resolve({
        filename: 'not-json.txt',
        content: 'i am not json'
      }));

      setImmediate(() => {
        expect((notifier.display as sinon.SinonStub).args).to.deep.equal([
          [{
            type: 'error',
            title: 'Failed to replay message log',
            message: 'The file that you attempted to import could not be replayed:',
            code: 'SyntaxError: Unexpected token i in JSON at position 0'
          }]
        ]);

        done();
      })
    });
  });

  describe('when importing an empty JSON file', () => {
    it('displays an error message', done => {
      importLog.importLog(Promise.resolve({
        filename: 'empty.json',
        content: JSON.stringify([])
      }));

      setImmediate(() => {
        expect((notifier.display as sinon.SinonStub).args).to.deep.equal([
          [{
            type: 'error',
            title: 'Failed to replay message log',
            message: 'The file that you attempted to import could not be replayed:',
            code: "Error: Log 'empty.json' does not contain any replayable message(s)"
          }]
        ]);

        done();
      })
    });
  });
});
