import { expect } from 'chai';
import { shallow } from 'enzyme';

import * as inspector from './object-inspector';

const obj = {
  Arrow: 'TestArrow',
  name: 'test',
  depth: 0,
  renderedNode: 'TestNode',
  data: {
    __old: 1,
    __new: 2
  },
  styles: {}
} as any;

describe('nodeRenderer', () => {
  context('when `obj` is a modified root object', () => {
    it('renders an ObjectName and ObjectPreview', () => {
      const wrapper = shallow(inspector.nodeRenderer(obj));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectPreview').prop('data')).to.equal(2);
    })
  });

  context('when `obj` is a modified non-root object', () => {
    it('renders an ObjectName and ObjectValue', () => {
      const wrapper = shallow(inspector.nodeRenderer({ ...obj, depth: 1 }));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectValue').prop('object')).to.equal(2);
    })
  });

  context('when `obj` is a modified root array', () => {
    it('renders an ObjectName and ObjectPreview', () => {
      const data = [['+', 'one'], ['+', 'two']];

      const wrapper = shallow(inspector.nodeRenderer({ ...obj, data }));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectPreview').prop('data')).to.deep.equal(data);
    })
  });

  context('when `obj` is any other type', () => {
    it('renders an ObjectName and ObjectPreview', () => {
      const data = {
        test: 'value'
      };

      const wrapper = shallow(inspector.nodeRenderer({ ...obj, data }));
      expect(wrapper.find('ObjectName').prop('name')).to.equal('test');
      expect(wrapper.find('ObjectPreview').prop('data')).to.deep.equal(data);
    });
  })
});

describe('diffNodeMapper', () => {
  context('when `object` is a modified object', () => {
    it('renders a model diff', () => {
      const wrapper = shallow(inspector.diffNodeMapper(obj));
      expect(wrapper.find('.model-diff.modified').exists()).to.equal(true);
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
