import * as React from 'react';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { shallow, ShallowWrapper } from 'enzyme';

import { Notifier } from './Notifier';

const notice = {
  type: 'success' as 'success',
  title: 'This is what a notification looks like',
  message: 'It worked!',
  code: 'Hooray'
};

describe('Notifier', () => {
  let wrapper: ShallowWrapper;

  beforeEach(() => {
    wrapper = shallow(<Notifier />);
  });

  afterEach(() => {
    wrapper.unmount();
  });

  it('renders nothing by default', () => {
    expect(wrapper.isEmptyRender()).to.equal(true);
  });

  it('renders a notification when added', () => {
    (wrapper.instance() as Notifier).add(notice);
    wrapper.update();

    expect(wrapper.find('.notifier__notice--success').exists()).to.equal(true);
    expect(wrapper.find('.notifier__notice__title').text()).to.equal(notice.title);
    expect(wrapper.find('.notifier__notice__message').text()).to.equal(notice.message);
    expect(wrapper.find('.notifier__notice__code').text()).to.equal(notice.code);
  });

  it('hides notification when clicked', () => {
    (wrapper.instance() as Notifier).add(notice);
    wrapper.update();

    wrapper.find('.notifier__notice__close').simulate('click');
    expect(wrapper.isEmptyRender()).to.equal(true);
  });

  it('hides notification automatically after 5 seconds', () => {
    const clock = sinon.useFakeTimers();

    (wrapper.instance() as Notifier).add(notice);
    wrapper.update();

    clock.tick(5000);
    wrapper.update();

    expect(wrapper.isEmptyRender()).to.equal(true);

    clock.restore();
  });
});
