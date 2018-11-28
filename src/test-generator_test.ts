import 'mocha';
import { expect } from 'chai';

import { generateUnitTest } from './test-generator';

describe('generateUnitTest()', () => {
  context('when a single message is selected', () => {
    const increment = {
      name: 'TestContainer',
      message: 'Increment',
      path: [],
      data: { step: 1, type: 'click' },
      //prev: { count: 0 },
      //next: { count: 1 },
      relay: {}
    } as any;

    const initial = { count: 0 };
    const final = { count: 1 };

    it('generates a basic test', () => {
      const result = generateUnitTest([increment], initial, final, []);

      expect(result).to.equal([
        `it('should respond to Increment messages', () => {`,
        `  const container = isolate(TestContainer);`,
        `  container.push({count: 0});`,
        `  container.dispatch(new Increment({step: 1, type: "click"}));`,
        '',
        `  expect(container.state()).to.deep.equal({count: 1});`,
        `});`
      ].join('\n'));
    });

    context('when `relay` property is present in message', () => {
      const relay = { foo: 'bar' };

      it('passes as `relay` when creating isolated container', () => {
        const result = generateUnitTest([{ ...increment, relay }], initial, final, []);

        expect(result).to.equal([
          `it('should respond to Increment messages', () => {`,
          `  const container = isolate(TestContainer, {`,
          `    relay: {foo: "bar"}`,
          `  });`,
          `  container.push({count: 0});`,
          `  container.dispatch(new Increment({step: 1, type: "click"}));`,
          '',
          `  expect(container.state()).to.deep.equal({count: 1});`,
          `});`
        ].join('\n'));
      });
    });

    context('when `commands` are present in message', () => {
      const save = {
        name: 'TestContainer',
        message: 'Save',
        path: [],
        data: {},
        commands: [
          ['LocalStorage.Write', { value: 1 }]
        ]
      } as any;

      const initial = { count: 1 };
      const final = { count: 1 };

      it('assigns result of `dispatch` to `container` and makes assertions on it', () => {
        const result = generateUnitTest([save], initial, final, []);

        expect(result).to.equal([
          `it('should respond to Save messages', () => {`,
          `  const container = isolate(TestContainer);`,
          `  container.push({count: 1});`,
          `  const commands = container.dispatch(new Save({}));`,
          '',
          `  expect(commands).to.deep.equal([`,
          `    new LocalStorage.Write({value: 1}),`,
          `  ]);`,
          '',
          `  expect(container.state()).to.deep.equal({count: 1});`,
          `});`
        ].join('\n'));
      });
    });

    context('when a dependency trace is available for a message', () => {
      const incrementPath = {
        ...increment,
        path: ['counter'],
        relay: {
          foo: 'bar'
        }
      };

      const trace = {
        model: [
          ['counter', 'value']
        ],

        relay: [
          ['foo']
        ],

        message: [
          ['step']
        ]
      } as any;

      const initial = {
        counter: { value: 0 },
        flag: { value: false }
      };

      const final = {
        counter: { value: 1 },
        flag: { value: false }
      };

      it('only picks dependent properties in state, relay and message data', () => {
        const result = generateUnitTest([incrementPath], initial, final, [trace]);

        expect(result).to.equal([
          `it('should respond to Increment messages', () => {`,
          `  const container = isolate(TestContainer, {`,
          `    relay: {foo: "bar"}`,
          `  });`,
          `  container.push({`,
          `    counter: {value: 0}`,
          `  });`,
          `  container.dispatch(new Increment({step: 1}));`,
          '',
          `  expect(container.state()).to.deep.equal({`,
          `    counter: {value: 1}`,
          `  });`,
          `});`
        ].join('\n'));
      });
    });
  });

  context('when multiple messages are selected', () => {
    const messages = [{
      name: 'TestContainer',
      message: 'Increment',
      path: [],
      data: { step: 1, type: 'click' },
      relay: {}
    }, {
      name: 'TestContainer',
      message: 'Increment',
      path: [],
      data: { step: 1, type: 'click' },
      relay: {}
    }, {
      name: 'TestContainer',
      message: 'Save',
      path: [],
      data: {},
      relay: {}
    }, {
      name: 'TestContainer',
      message: 'Decrement',
      path: [],
      data: { step: 2, type: 'click' }
    }] as any[];

    const initial = { count: 0 };
    const final = { count: 0, xs: ['a', 'b'] };

    it('generates a basic test', () => {
      const result = generateUnitTest(messages, initial, final, []);
      expect(result).to.equal([
        `it('should respond to Increment (x2), Save and Decrement messages', () => {`,
        `  const container = isolate(TestContainer);`,
        `  container.push({count: 0});`,
        `  container.dispatch(`,
        `    new Increment({step: 1, type: "click"}),`,
        `    new Increment({step: 1, type: "click"}),`,
        `    new Save({}),`,
        `    new Decrement({step: 2, type: "click"})`,
        `  );`,
        '',
        `  expect(container.state()).to.deep.equal({`,
        `    count: 0,`,
        `    xs: ["a", "b"]`,
        `  });`,
        `});`
      ].join('\n'));
    });

    context('when messages have `relay` properties', () => {
      it('uses first message relay property when creating isolated container', () => {
        const relayMsgs = messages.map((msg, index) => ({
          ...msg,
          relay: {
            foo: index
          }
        }));

        const result = generateUnitTest(relayMsgs, initial, final, []);

        expect(result).to.equal([
          `it('should respond to Increment (x2), Save and Decrement messages', () => {`,
          `  const container = isolate(TestContainer, {`,
          `    relay: {foo: 0}`,
          `  });`,
          `  container.push({count: 0});`,
          `  container.dispatch(`,
          `    new Increment({step: 1, type: "click"}),`,
          `    new Increment({step: 1, type: "click"}),`,
          `    new Save({}),`,
          `    new Decrement({step: 2, type: "click"})`,
          `  );`,
          '',
          `  expect(container.state()).to.deep.equal({`,
          `    count: 0,`,
          `    xs: ["a", "b"]`,
          `  });`,
          `});`
        ].join('\n'));
      })
    });

    context('when dependency traces are available for each message', () => {
      const traces = [{
        model: [['count']],
        relay: [['foo']],
        message: [['step']]
      }, {
        model: [['count']],
        relay: [['foo']],
        message: [['step']]
      }, {
        model: [['count'], ['xs']],
        relay: [['foo']],
        message: [['step']]
      }, {
        model: [['count']],
        relay: [['foo']],
        message: [['step']]
      }] as any[];

      it('only picks dependent properties in initial state, relay and message data', () => {
        const relayMsgs = messages.map((msg, index) => ({
          ...msg,
          relay: {
            foo: index,
            baz: 'quux'
          }
        }));

        const result = generateUnitTest(relayMsgs, initial, final, traces);

        expect(result).to.equal([
          `it('should respond to Increment (x2), Save and Decrement messages', () => {`,
          `  const container = isolate(TestContainer, {`,
          `    relay: {foo: 0}`,
          `  });`,
          `  container.push({count: 0});`,
          `  container.dispatch(`,
          `    new Increment({step: 1}),`,
          `    new Increment({step: 1}),`,
          `    new Save({}),`,
          `    new Decrement({step: 2})`,
          `  );`,
          '',
          `  expect(container.state()).to.deep.equal({`,
          `    count: 0,`,
          `    xs: ["a", "b"]`,
          `  });`,
          `});`
        ].join('\n'));
      });
    });
  });
});
