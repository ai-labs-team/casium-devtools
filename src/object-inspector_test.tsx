import * as React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';

import { CopyableObjectLabel, CopyableObjectRootLabel, NodeRenderer } from './object-inspector';

const node = {
  Arrow: 'TestArrow',
  name: 'test',
  depth: 0,
  renderedNode: 'TestNode',
  data: {
    count: 2
  },
  styles: {}
} as any;

describe('NodeRenderer', () => {
  context('when `obj` is a root object', () => {
    it('renders a CopyableObjectRootLabel', () => {
      const wrapper = shallow(<NodeRenderer {...node} />);
      const rootLabel = wrapper.find('CopyableObjectRootLabel');

      expect(rootLabel.prop('name')).to.equal('test');
      expect(rootLabel.prop('data')).to.deep.equal({ count: 2 });
    });
  });

  context('when `obj` is not a root object', () => {
    it('renders a CopyableObjectLabel', () => {
      const wrapper = shallow(<NodeRenderer {...node} depth={1} />);
      const rootLabel = wrapper.find('CopyableObjectLabel');

      expect(rootLabel.prop('name')).to.equal('test');
      expect(rootLabel.prop('data')).to.deep.equal({ count: 2 });
    });
  });
});

describe('CopyableObjectRootLabel', () => {
  it('renders an ObjectRootLabel and a CopyButton', () => {
    const wrapper = shallow(<CopyableObjectRootLabel name="test" data={{ hello: 'world' }} />);

    expect(wrapper.find('ObjectRootLabel').props()).to.deep.equal({
      name: 'test',
      data: { hello: 'world' }
    });

    expect(wrapper.find('CopyButton').props()).to.deep.equal({
      data: { hello: 'world' }
    });
  });
});

describe('CopyableObjectLabel', () => {
  context('when data is an object', () => {
    it('renders an ObjectLabel and CopyButton', () => {
      const wrapper = shallow(<CopyableObjectLabel name="test" data={{ hello: 'world' }} isNonenumerable={false} />);

      expect(wrapper.find('ObjectLabel').props()).to.deep.equal({
        name: 'test',
        data: { hello: 'world' },
        isNonenumerable: false
      });

      expect(wrapper.find('CopyButton').props()).to.deep.equal({
        data: { hello: 'world' },
      });
    });
  });

  context('when data is a non-object', () => {
    it('renders an ObjectLabel and CopyButton', () => {
      const wrapper = shallow(<CopyableObjectLabel name="hello" data="world" isNonenumerable={false} />);

      expect(wrapper.find('ObjectLabel').props()).to.deep.equal({
        name: 'hello',
        data: 'world',
        isNonenumerable: false
      });

      expect(wrapper.find('CopyButton').length).to.equal(0);
    });
  });
});
