import * as React from 'react';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { shallow } from 'enzyme';

import { App } from './App';
import * as util from './util';

declare var global: {
  window: {
    LISTENERS: Function[][],
    FLUSH_QUEUE: () => void,
    messageClient: sinon.SinonSpy
  };
};

beforeEach(() => {
  global.window = {
    LISTENERS: [],
    FLUSH_QUEUE: () => { },
    messageClient: sinon.spy()
  };
});

context('when a new message is received', () => {
  it('is appended to `state.messages`', () => {
    const wrapper = shallow(<App />);
    const message = { id: '0', from: 'Arch' };
    global.window.LISTENERS[0][1](message);

    expect(wrapper.state().messages).to.deep.equal([message]);
  });

  it('un-sets `state.haltForReplay` if currently set', () => {
    const message = { id: '0', from: 'ArchDevToolsPanel' };
    const wrapper = shallow(<App />);
    wrapper.setState({ haltForReplay: true });

    global.window.LISTENERS[1][1](message);
    expect(wrapper.state().haltForReplay).to.equal(false);
  });

  it('sets `state.haltForReplay` to `true` and replays currently selected message', () => {
    const message = { id: '0', from: 'CasiumDevToolsPageScript', state: 'initialized' };
    const wrapper = shallow(<App />);
    wrapper.setState({
      messages: [{ id: '1' }],
      selected: [{ id: '1' }],
      active: {
        ...wrapper.state().active,
        replay: true
      }
    });

    global.window.LISTENERS[2].forEach(listener => listener(message));

    expect(wrapper.state().haltForReplay).to.equal(true);
    expect(global.window.messageClient.calledWith({ selected: { id: '1' } })).to.equal(true);
  });

  context('when `state.active.clearOnReload` is `true`', () => {
    it('clears message history and selection, and sets `state.haltForReplay` to `false`', () => {
      const message = { id: '0', from: 'CasiumDevToolsPageScript', state: 'initialized' };
      const wrapper = shallow(<App />);
      wrapper.setState({
        messages: [{ id: '1' }],
        selected: [{ id: '1' }],
        haltForReplay: true,
        active: {
          ...wrapper.state().active,
          clearOnReload: true
        }
      });

      global.window.LISTENERS[2].forEach(listener => listener(message));

      const state = wrapper.state();
      expect(state.haltForReplay).to.equal(false);
      expect(state.messages).to.deep.equal([]);
      expect(state.selected).to.deep.equal([]);
    });
  });
});

const messages = [{
  id: '0'
}, {
  id: '1',
    message: "test"
}, {
  id: '2',
}, {
  id: '3'
}];

context('when a message is clicked', () => {
  it('sets `state.selected` to the message that was clicked', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages });
      wrapper.find('.panel-item').at(1).simulate('click', {});

    expect(wrapper.state().selected).to.deep.equal([{
      id: '1'
    }]);
  });

  context('when time-travel is enabled', () => {
    it('sends a message to the client', () => {
      const wrapper = shallow(<App />);
      wrapper.setState({
        messages,
        active: {
          timeTravel: true
        }
      });

      wrapper.find('.panel-item').at(1).simulate('click', {});

      expect(global.window.messageClient.calledWith({
        selected: {
          id: '1'
        }
      })).to.equal(true);
    });
  });
});

context('when a message is shift-clicked', () => {
  it('sets `state.selected` to the new selection range', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages });

    wrapper.find('.panel-item').at(1).simulate('click', { shiftKey: true });
    expect(wrapper.state().selected).to.deep.equal([{
      id: '1'
    }]);

    wrapper.find('.panel-item').at(2).simulate('click', { shiftKey: true });
    expect(wrapper.state().selected).to.deep.equal([{
      id: '1'
    }, {
      id: '2'
    }]);

    wrapper.find('.panel-item').at(0).simulate('click', { shiftKey: true });
    expect(wrapper.state().selected).to.deep.equal([{
      id: '0'
    }, {
      id: '1'
    }, {
      id: '2'
    }]);

    wrapper.find('.panel-item').at(3).simulate('click', { shiftKey: true });
    expect(wrapper.state().selected).to.deep.equal([{
      id: '0'
    }, {
      id: '1'
    }, {
      id: '2'
    }, {
      id: '3'
    }]);

    wrapper.find('.panel-item').at(2).simulate('click', { shiftKey: true });
    expect(wrapper.state().selected).to.deep.equal([{
      id: '0'
    }, {
      id: '1'
    }, {
      id: '2'
    }]);
  });
});

describe('clear button', () => {
  it('clears messages on click', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages });

    wrapper.find('.clear-messages-button').simulate('click', {});
    expect(wrapper.state().messages).to.deep.equal([]);
  });

  it('toggles `active.clearOnReload` when meta- or ctrl-clicked', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages });

    wrapper.find('.clear-messages-button').simulate('click', { metaKey: true });
    const state = wrapper.state();
    expect(state.messages).to.deep.equal(messages);
    expect(state.active.clearOnReload).to.equal(true);

    wrapper.find('.clear-messages-button').simulate('click', { ctrlKey: true });
    expect(wrapper.state().active.clearOnReload).to.equal(false);
  });
})

describe('time travel button', () => {
  it('toggles `state.active.timeTravel` on click', () => {
    const wrapper = shallow(<App />);
    wrapper.find('.time-travel-button').simulate('click');

    expect(wrapper.state().active.timeTravel).to.equal(true);
  });
});

describe('unit test button', () => {
  it('toggles `state.active.unitTest` on click', () => {
    const wrapper = shallow(<App />);
    wrapper.find('.unit-test-button').simulate('click');

    expect(wrapper.state().active.unitTest).to.equal(true);
  });
});

describe('download button', () => {
  beforeEach(() => {
    sinon.stub(util, 'download')
  });

  it('downloads a JSON representation of message history on click', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages });
    wrapper.find('.save-msg-button').simulate('click');

    expect((util.download as sinon.SinonSpy).calledWith({
      data: `[
  {
    "id": "0"
  },
  {
    "id": "1"
  },
  {
    "id": "2"
  },
  {
    "id": "3"
  }
]`,
      filename: 'message-log.json'
    })).to.equal(true);
  });
});

describe('replay button', () => {
  it('is not visible when no messages are selected', () => {
    const wrapper = shallow(<App />);
    expect(wrapper.find('.replay-button').exists()).to.equal(false);
  });

  it('toggles `state.active.replay` on click', () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ messages, selected: messages });
    wrapper.find('.replay-button').simulate('click');

    expect(wrapper.state().active.replay).to.equal(true);
  });
})
