import * as React from 'react';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { shallow } from 'enzyme';

import { MessageView } from './MessageView';
import * as dependencyTrace from './dependency-trace';
import { setImmediate } from 'timers';

const getState = (wrapper: any): any => wrapper.state() as any;

const messages = [{
  id: '0',
  name: 'TestContainer',
  message: 'Increment',
  path: [],
  data: { step: 1, type: 'click' },
  delta: [[['count'], 1]],
  relay: {},
  commands: []
}, {
  id: '1',
  name: 'TestContainer',
  message: 'Increment',
  path: [],
  data: { step: 1, type: 'click' },
  delta: [[['count'], 2]],
  relay: {},
  commands: []
}, {
  id: '2',
  name: 'TestContainer',
  message: 'Save',
  path: [],
  data: { value: 2 },
  delta: null,
  relay: {},
  commands: [
    ['LocalStorage.Write', { value: 2 }]
  ]
}] as any[];

const initial = { count: 0 };

it('displays data given to each selected message', () => {
  const wrapper = shallow(<MessageView selected={messages} initialState={initial} />);
  expect(wrapper.find('.message')).to.have.length(3);

  const inspector = wrapper.find('.message ObjectInspector').at(1);
  expect(inspector.prop('data')).to.deep.equal({ step: 1, type: 'click' });
});

it('displays all commands dispatched by selected messages', () => {
  const wrapper = shallow(<MessageView selected={messages} initialState={initial} />);
  expect(wrapper.find('.command')).to.have.length(1);
});

context('when `showPrevState` is `true`', () => {
  it('displays previous state of first message', () => {
    const wrapper = shallow(<MessageView selected={messages} initialState={initial} showPrevState={true} />);
    const inspector = wrapper.find('.previous-state ObjectInspector');

    expect(inspector.prop('data')).to.deep.equal({ count: 0 });
  });
});

context('when `showNextState` is `true`', () => {
  it('displays next state of last message', () => {
    const wrapper = shallow(<MessageView selected={messages} initialState={initial} showNextState={true} />);
    const inspector = wrapper.find('.next-state ObjectInspector');

    expect(inspector.prop('data')).to.deep.equal({ count: 2 });
  });
});

context('when `showDiffState` is `true`', () => {
  it('displays difference in state between first and last message', () => {
    const wrapper = shallow(<MessageView selected={messages} initialState={initial} showDiffState={true} />);
    const inspector = wrapper.find('.diff-state DeltaInspector');

    expect(inspector.prop('prev')).to.equal(initial);
    expect(inspector.prop('delta')).to.deep.equal([
      [['count'], 1],
      [['count'], 2]
    ]);
  });

  it('does not display an inspector when no changes have occurred', () => {
    const wrapper = shallow(<MessageView selected={[messages[2]]} initialState={initial} showDiffState={true} />);
    const em = wrapper.find('em');

    expect(em.text()).to.equal('No Changes');
  });
});

context('when `useDependencyTrace` is `true`', () => {
  beforeEach(() => {
    sinon.stub(dependencyTrace, 'runDependencyTrace').returns({
      message: [['step']],
      relay: []
    });
  });

  afterEach(() => {
    (dependencyTrace.runDependencyTrace as sinon.SinonStub).restore();
  });

  it('only displays dependencies in message data', done => {
    const wrapper = shallow(<MessageView selected={messages} initialState={initial} useDependencyTrace={true} />);

    setImmediate(() => {
      wrapper.update();
      const inspector = wrapper.find('.message .message-properties ObjectInspector').at(0);

      expect(inspector.prop('data')).to.deep.equal({ step: 1 })
      done();
    });
  });

  context('when `useDependencyTrace` changes from `true` to `false`', () => {
    it('un-sets stored trace on `state`', done => {
      const wrapper = shallow(<MessageView selected={messages} initialState={initial} useDependencyTrace={true} />);

      setImmediate(() => {
        wrapper.setProps({ useDependencyTrace: false });

        setImmediate(() => {
          expect(getState(wrapper).dependencyTraces).to.deep.equal([])
          done();
        })
      });
    });
  });

  context('when `useDependencyTrace` changes from `false` to `true`', () => {
    it('sets stored trace on `state`', done => {
      const wrapper = shallow(<MessageView selected={messages} initialState={initial} useDependencyTrace={false} />);

      wrapper.setProps({ useDependencyTrace: true });

      setImmediate(() => {
        expect(getState(wrapper).dependencyTraces).to.deep.equal([{
          message: [['step']],
          relay: []
        }, {
          message: [['step']],
          relay: []
        }, {
          message: [['step']],
          relay: []
        }])

        done();
      });
    });
  });

  context('when `selected` changes', () => {
    it('updates the trace stored on `state`', done => {
      const wrapper = shallow(<MessageView selected={messages} initialState={initial} useDependencyTrace={true} />)

      setImmediate(() => {
        wrapper.setProps({ selected: messages.slice(0, 2) });

        setImmediate(() => {
          expect(getState(wrapper).dependencyTraces).to.have.length(2);
          done();
        });
      });
    });
  });
});

context('when `showUnitTest` is `true`', () => {
  it('displays unit test content', () => {
    const wrapper = shallow(<MessageView selected={messages} initialState={initial} showUnitTest={true} />);
    const unitTest = wrapper.find('.unit-test-content');

    expect(unitTest.text()).to.equal('Generating Unit Test...');
  });

  context('when `showUnitTest` changes from `false` to `true`', () => {
    it('updates the test content stored on `state`', done => {
      const wrapper = shallow(<MessageView selected={messages} initialState={initial} showUnitTest={false} />);
      wrapper.setProps({ showUnitTest: true });

      setImmediate(() => {
        expect(getState(wrapper).unitTest).to.contain('should respond to Increment (x2) and Save messages');
        done();
      })
    });
  });

  context('when `selected` changes', () => {
    it('updates the test content stored on `state`', done => {
      const wrapper = shallow(<MessageView selected={messages} initialState={initial} showUnitTest={true} />);
      wrapper.setProps({ selected: messages.slice(0, 2) });

      setImmediate(() => {
        expect(getState(wrapper).unitTest).to.contain('should respond to Increment (x2) messages');
        done();
      })
    });
  });
});

