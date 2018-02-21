import { expect } from 'chai';

import { dependencyTrace } from './dependency-trace';

declare var global: {
  window: {
    _ARCH_DEV_TOOLS_STATE: {
      contexts: {
        test: {
          container: {
            update: Map<{ name: string }, (model: {}, message?: {}, relay?: {}) => any>
          }
        }
      }
    }
  }
}

describe('dependencyTrace()', () => {
  beforeEach(() => {
    global.window = {
      _ARCH_DEV_TOOLS_STATE: {
        contexts: {
          test: {
            container: {
              update: new Map([
                [{ name: 'Increment' }, (model: any, message: any, relay: any) => ({
                  count: relay.token === 'test' ? model.count + message.step : 0
                })],
                [{ name: 'IncrementTwice' }, (model: any, message: any, relay: any) => ({
                  count: relay.token.length > 0 && relay.token.length < 5 ? model.count + model.count + message.step : 0
                })],
                [{ name: 'IncrementCounter' }, (model: any, message: any) => ({ count: model.counter.count + message.step })],
                [{ name: 'IncrementKeys' }, (model: any, message: any) => ({ count: model.count + Object.keys(message).length })]
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
})
