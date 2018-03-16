import { expect } from 'chai';
import * as sinon from 'sinon';

import * as importLog from './import-log';
import * as util from './util';
import * as notifier from './Notifier';
import { SerializedMessage } from './messaging';

declare var global: {
  window: {
    messageClient: sinon.SinonSpy
  }
}

describe('lastMessageByPath()', () => {
  const tests = [{
    messages: [{
      path: [],
      next: { value: 0 }
    }, {
      path: [],
      next: { value: 1 }
    }, {
      path: [],
      next: { value: 2 }
    }],
    result: [{
      path: [],
      next: { value: 2 }
    }]
  }, {
    messages: [{
      path: [],
      next: {
        counter: { value: 0 },
        message: { title: '' }
      }
    }, {
      path: ['counter'],
      next: { value: 10 }
    }, {
      path: ['message'],
      next: { title: 'hello' }
    }, {
      path: ['counter'],
      next: { value: 9 }
    }, {
      path: ['message'],
      next: { title: 'goodbye' }
    }],
    result: [{
      path: [],
      next: {
        counter: { value: 0 },
        message: { title: '' }
      }
    }, {
      path: ['counter'],
      next: { value: 9 }
    }, {
      path: ['message'],
      next: { title: 'goodbye' }
    }]
  }];

  it('returns an array containing the last Message handled by a given path', () => {
    tests.forEach(({ messages, result }) => {
      expect(importLog.lastMessageByPath(messages as any)).to.deep.equal(result);
    });
  });
});

describe('importLog', () => {
  before(() => {
    sinon.stub(util, 'upload');
    sinon.stub(notifier, 'display');
  });

  afterEach(() => {
    (util.upload as sinon.SinonStub).reset();
    (notifier.display as sinon.SinonStub).reset();
  });

  it('uses time travel to replay the last message for each path', done => {
    global.window.messageClient = sinon.spy();

    (util.upload as sinon.SinonStub).resolves({
      filename: 'messages.json',
      content: JSON.stringify([{
        path: [],
        next: {
          counter: { value: 0 },
          message: { title: '' }
        }
      }, {
        path: ['counter'],
        next: { value: 10 }
      }, {
        path: ['message'],
        next: { title: 'hello' }
      }, {
        path: ['counter'],
        next: { value: 9 }
      }, {
        path: ['message'],
        next: { title: 'goodbye' }
      }])
    });

    importLog.importLog();

    setImmediate(() => {
      expect(global.window.messageClient.args).to.deep.equal([
        [{
          selected: {
            path: [],
            next: {
              counter: { value: 0 },
              message: { title: '' }
            }
          }
        }], [{
          selected: {
            path: ['counter'],
            next: { value: 9 }
          }
        }], [{
          selected: {
            path: ['message'],
            next: { title: 'goodbye' }
          }
        }]
      ]);

      expect((notifier.display as sinon.SinonStub).args).to.deep.equal([
        [{
          type: 'success',
          title: 'Successfully replayed message log',
          message: `Log 'messages.json' contained 3 replayable message(s)`
        }]
      ]);

      done();
    })
  });

  describe('when importing a non-JSON file', () => {
    it('displays an error message', done => {
      (util.upload as sinon.SinonStub).resolves({
        filename: 'not-json.txt',
        content: 'i am not json'
      });

      importLog.importLog();

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
      (util.upload as sinon.SinonStub).resolves({
        filename: 'empty.json',
        content: JSON.stringify([])
      });

      importLog.importLog();

      setImmediate(() => {
        expect((notifier.display as sinon.SinonStub).args).to.deep.equal([
          [{
            type: 'warning',
            title: 'No messages to replay',
            message: `Log 'empty.json' does not contain any replayable message(s)`
          }]
        ]);

        done();
      })
    });
  });
});
