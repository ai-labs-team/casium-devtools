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

const initial = {};

const messages = [{
  id: '0',
  message: '0',
  delta: [[['counter'], 0], [['flag'], false]]
}, {
  id: '1',
  message: '1',
  delta: [[['counter'], 1]]
}, {
  id: '2',
  message: '2',
  delta: [[['flag'], true]]
}, {
  id: '3',
  message: '3',
  delta: null
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

    (util.upload as sinon.SinonStub).resolves({
      filename: 'messages.json',
      content: JSON.stringify({
        version: '1',
        initial,
        messages
      })
    });

    importLog.importLog();

    setImmediate(() => {
      expect(global.window.messageClient.args).to.deep.equal([
        [{
          setState: {
            counter: 1,
            flag: true
          }
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
            type: 'error',
            title: 'Failed to replay message log',
            message: 'The file that you attempted to import could not be replayed:',
            code: 'Error: Unknown Message Log format/version'
          }]
        ]);

        done();
      })
    });
  });
});
