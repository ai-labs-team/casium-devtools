import { expect } from 'chai';
import * as sinon from 'sinon';

import { dependencyTrace } from './dependency-trace';

declare var global: {
  window: {
    _ARCH_DEV_TOOLS_STATE: {
      contexts: {
        [key: string]: {
          path: string[];
          container: {
            update: Map<{ name: string }, (model: {}, message?: {}, relay?: {}) => any>
          }
        }
      }
    }
  }
}

const toggleUpdater = sinon.spy((flag: any) => ({
  value: !flag.value
}));

describe('dependencyTrace()', () => {
  beforeEach(() => {
    global.window = {
      _ARCH_DEV_TOOLS_STATE: {
        contexts: {
          test: {
            path: [],
            container: {
              update: new Map([
                [{ name: 'Increment' }, (model: any, message: any, relay: any) => ({
                  count: relay.token === 'test' ? model.count + message.step : 0
                })],
                [{ name: 'IncrementTwice' }, (model: any, message: any, relay: any) => ({
                  count: relay.token.length > 0 && relay.token.length < 5 ? model.count + model.count + message.step : 0
                })],
                [{ name: 'IncrementCounter' }, (model: any, message: any) => ({ count: model.counter.count + message.step })],
                [{ name: 'IncrementKeys' }, (model: any, message: any) => ({
                  count: Object.keys(model).length + Object.keys(message).length
                })]
              ])
            }
          },

          testWithPath: {
            path: ['flag'],
            container: {
              update: new Map([
                [{ name: 'Toggle' }, toggleUpdater]
              ])
            }
          }
        }
      }
    }
  });

  it('throws an error when `context` does not exist', () => {
    expect(() => dependencyTrace('1234', 'Increment', {})).to.throw(`Context '1234' does not exist`);
  });

  it('throws an error when Updater of type `Name` does not exist', () => {
    expect(() => dependencyTrace('test', 'Test', {})).to.throw(`Context 'test' does not contain an Updater of type 'Test'`);
  });

  it('returns paths accessed by Updater on `model`, `message` and `relay`', () => {
    const trace = dependencyTrace('test', 'Increment', { count: 0 }, { step: 1 }, { token: 'test' });

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [['step']],
      relay: [['token']]
    });
  });

  it('handles deeply nested paths', () => {
    const trace = dependencyTrace('test', 'IncrementCounter', { counter: { count: 0 } }, { step: 1 });

    expect(trace).to.deep.equal({
      model: [
        ['counter'],
        ['counter', 'count']
      ],
      message: [['step']],
      relay: []
    });
  });

  it('de-duplicates paths', () => {
    const trace = dependencyTrace('test', 'IncrementTwice', { count: 0 }, { step: 1 }, { token: 'test' });

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [['step']],
      relay: [['token']]
    });
  });

  it('handles key enumeration', () => {
    const trace = dependencyTrace('test', 'IncrementKeys', { count: 0 }, { step: 1, other: 2 });

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [
        ['step'],
        ['other']
      ],
      relay: []
    });
  });

  it('stringifies Symbol keys', () => {
    const trace = dependencyTrace('test', 'IncrementKeys', { count: 0, [Symbol.toStringTag]: 'CustomStateObject' }, { step: 1, other: 2, [Symbol.toStringTag]: 'CustomMessageObject' });

    expect(trace).to.deep.equal({
      model: [
        ['count'],
        ['Symbol(Symbol.toStringTag)']
      ],
      message: [
        ['step'],
        ['other'],
        ['Symbol(Symbol.toStringTag)']
      ],
      relay: []
    });
  });

  it(`only uses model data at 'context.path', and prepends it to accessed path`, () => {
    const trace = dependencyTrace('testWithPath', 'Toggle', { count: 0, flag: { value: false } }, {});

    expect(trace).to.deep.equal({
      model: [['flag', 'value']],
      message: [],
      relay: []
    });

    expect(toggleUpdater.lastCall.args[0]).to.deep.equal({
      value: false
    });
  });
})
