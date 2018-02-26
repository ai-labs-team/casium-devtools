import * as React from 'react';
import { expect } from 'chai';
import { shallow } from 'enzyme';

import * as inspector from './object-inspector';

const obj = {
  Arrow: 'TestArrow',
  name: 'test',
  depth: 0,
  renderedNode: 'TestNode',
  data: {
    count: {
      __old: 1,
      __new: 2
    }
  },
  styles: {}
} as any;

const NodeStub: React.StatelessComponent<{ data?: any, id: string }> = ({ id }) => (
  <div id={id} />
);

describe('nodeRenderer', () => {
  context('when `obj` is a root object', () => {
    it('renders an ObjectName and ObjectPreview', () => {
      const wrapper = shallow(inspector.nodeRenderer(obj));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectPreview').prop('data')).to.deep.equal(obj.data);
    })
  });

  context('when `obj` is a non-root object', () => {
    it('renders an ObjectName and ObjectValue', () => {
      const wrapper = shallow(inspector.nodeRenderer({ ...obj, depth: 1 }));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectValue').prop('object')).to.deep.equal(obj.data);
    })
  });

  context('when `obj` is a root array', () => {
    it('renders an ObjectName and ObjectPreview', () => {
      const data = [['+', 'one'], ['+', 'two']];

      const wrapper = shallow(inspector.nodeRenderer({ ...obj, data }));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectPreview').prop('data')).to.deep.equal(data);
    })
  });
});

describe('diffNodeMapper', () => {
  context('when `object` is a modified object', () => {
    it('renders the `old` and `new` nodes directly, changing the `name` prop', () => {
      const wrapper = shallow(inspector.diffNodeMapper({
        ...obj,
        data: obj.data.count,
        childNodes: [
          <NodeStub id="oldNode" />,
          <NodeStub id="newNode" />
        ]
      }));
      expect(wrapper.find('#oldNode').prop('name')).to.equal('test');
      expect(wrapper.find('#newNode').prop('name')).to.equal('test');
    });
  });

  context('when `object` is a modified array', () => {
    it('renders added and deleted array elements', () => {
      const wrapper = shallow(inspector.diffNodeMapper({
        ...obj,
        data: [
          ['+', 4],
          [' ', 8],
          ['-', 15]
        ],
        childNodes: [
          <NodeStub id="node0" data={['+', 4]} />,
          <NodeStub id="node1" data={[' ', 8]} />,
          <NodeStub id="node2" data={['-', 15]} />
        ]
      }));

      const node0 = wrapper.find('#node0');
      expect(node0.parent().prop('className')).to.equal('model-diff added added-element');
      expect(node0.props()).to.deep.equal({
        id: 'node0',
        name: '0',
        data: 4,
      });

      const node1 = wrapper.find('#node1');
      expect(node1.exists()).to.equal(false);

      const node2 = wrapper.find('#node2');
      expect(node2.parent().prop('className')).to.equal('model-diff deleted deleted-element');
      expect(node2.props()).to.deep.equal({
        id: 'node2',
        name: '2',
        data: 15,
      });
    });
  });

  context('when `obj` is any other type', () => {
    it('renders an <ol/> element', () => {
      const wrapper = shallow(inspector.diffNodeMapper({ ...obj, data: { count: 1 } }));
      expect(wrapper.find('ol').exists()).to.equal(true);
    });
  });

  context('when `obj.name` contains `__added`', () => {
    it('adds `model-diff added added-key` class names to node', () => {
      const wrapper = shallow(inspector.diffNodeMapper({ ...obj, name: 'count__added', data: { count: 1 } }));
      expect(wrapper.find('.model-diff.added.added-key').exists()).to.equal(true);
    });
  });
});

describe('nodeMapper', () => {
  it('displays a `copy` button on nested objects that copies JSON to clipboard', () => {
    const wrapper = shallow(inspector.nodeMapper(obj));
    expect(wrapper.find('CopyButton').exists()).to.equal(true);
  });

  it('does not display a `copy` button for primitive values', () => {
    const wrapper = shallow(inspector.nodeMapper({ ...obj, data: 'test' }));
    expect(wrapper.find('CopyButton').exists()).to.equal(false);
  });
});
