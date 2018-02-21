import { expect } from 'chai';
import { shallow } from 'enzyme';
import { identity } from 'ramda';
import * as React from 'react';
import * as sinon from 'sinon';

import * as messageHeading from './MessageHeading';

const { MessageHeading } = messageHeading;

describe('timeSince()', () => {
  it('displays timestamps relative to current time in seconds', () => {
    const ts = Date.now() - (12.5 * 1000);
    expect(messageHeading.timeSince(ts)).to.equal('12s');
  });

  it('displays timestamps relative to current time in minutes', () => {
    const ts = Date.now() - (67.5 * 1000);
    expect(messageHeading.timeSince(ts)).to.equal('1m');
  });

  it('displays timestamps relative to current time in hours', () => {
    const ts = Date.now() - (60 * 125 * 1000);
    expect(messageHeading.timeSince(ts)).to.equal('2h');
  });

  it('displays timestamps as a formatted date string', () => {
    const year = new Date().getFullYear();
    expect(messageHeading.timeSince(new Date(`${year}-02-01`).getTime())).to.equal('1 Feb');
    expect(messageHeading.timeSince(new Date('2012-10-10').getTime())).to.equal('10 Oct 2012');
  });
});

describe('formatDate()', () => {
  it('displays timestamp as HH:mm:ss', () => {
    expect(messageHeading.formatDate(new Date('2012-10-10T06:30:22').getTime())).to.equal('06:30:22');
  });
});

describe('MessageHeading', () => {
  let clock: sinon.SinonFakeTimers;
  let msg: any;

  beforeEach(() => {
    sinon.stub(console, 'error').callsFake((warning: string) => {
      throw new Error(warning);
    });

    clock = sinon.useFakeTimers();
    msg = {
      name: 'TestComponent',
      ts: Date.now()
    }
  });

  afterEach(() => {
    clock.restore();
    (console.error as sinon.SinonStub).restore();
  })

  context('when `relativeTime` is `true`', () => {
    it('displays the relative timestamp, updating every second', () => {
      const wrapper = shallow(<MessageHeading msg={msg} relativeTime={true} onToggle={identity} />);

      expect(wrapper.text()).to.equal('TestComponent @ 0s');
      clock.tick(1000);
      wrapper.update();
      expect(wrapper.text()).to.equal('TestComponent @ 1s');
      clock.tick(1000);
      wrapper.update();
      expect(wrapper.text()).to.equal('TestComponent @ 2s');
    });

    it('removes the update handler when unmounted', () => {
      const wrapper = shallow(<MessageHeading msg={msg} relativeTime={true} onToggle={identity} />);
      wrapper.unmount();
      clock.tick(1000);
    });
  });

  describe('when `relativeTime` is `false`', () => {
    it('displays a static, absolute timestamp', () => {
      const wrapper = shallow(<MessageHeading msg={msg} relativeTime={false} onToggle={identity} />);

      expect(wrapper.text()).to.equal('TestComponent @ 00:00:00');
      clock.tick(1000);
      wrapper.update();
      expect(wrapper.text()).to.equal('TestComponent @ 00:00:00');
    });
  });

  describe('when `relativeTime` changes from `true` to `false`', () => {
    it('removes the update handler', () => {
      const wrapper = shallow(<MessageHeading msg={msg} relativeTime={true} onToggle={identity} />);

      expect(wrapper.text()).to.equal('TestComponent @ 0s');
      wrapper.setProps({ relativeTime: false });
      expect(wrapper.text()).to.equal('TestComponent @ 00:00:00');
    });
  });

  describe('when `relativeTime` changes from `false` to `true`', () => {
    it('registers the update handler', () => {
      const wrapper = shallow(<MessageHeading msg={msg} relativeTime={false} onToggle={identity} />);

      expect(wrapper.text()).to.equal('TestComponent @ 00:00:00');
      wrapper.setProps({ relativeTime: true });
      expect(wrapper.text()).to.equal('TestComponent @ 0s');
      clock.tick(1000);
      wrapper.update();
      expect(wrapper.text()).to.equal('TestComponent @ 1s');
    });
  });

  it('calls `onToggle` when label is clicked', () => {
    let relativeTime = false;
    const wrapper = shallow(<MessageHeading msg={msg} relativeTime={false} onToggle={value => relativeTime = value} />);

    wrapper.simulate('click');
    expect(relativeTime).to.equal(true);

    wrapper.setProps({ relativeTime: true });
    wrapper.simulate('click');
    expect(relativeTime).to.equal(false);
  });
});
