import { expect } from 'chai';

import * as util from './util';

describe('applyDelta()', () => {
  it('applies a message delta to `prev`', () => {
    const prev = {
      unchanged: 'string',
      deep: {
        unchanged: 10,
        deleted: true
      }
    };

    const msg = {
      delta: [
        ['deep', 'deleted'],
        [['deep', 'added'], 'hello'],
        [['added'], { hello: 'world' }]
      ]
    };

    const result = util.applyDelta(prev, msg as any);

    expect(result).to.deep.equal({
      unchanged: 'string',
      added: {
        hello: 'world'
      },
      deep: {
        unchanged: 10,
        added: 'hello'
      }
    })
  });
});

describe('applyDeltas()', () => {
  it('applies multiple message deltas to `prev`', () => {
    const prev = {
      unchanged: 'string',
      deep: {
        unchanged: 10,
        deleted: true
      }
    };

    const msgs = [{
      delta: [
        ['deep', 'deleted']
      ]
    }, {
      delta: [
        [['deep', 'added'], 'hello']
      ]
    }, {
      delta: [
        [['added'], { hello: 'world' }]
      ]
    }];

    const result = util.applyDeltas(prev, msgs as any);

    expect(result).to.deep.equal({
      unchanged: 'string',
      added: {
        hello: 'world'
      },
      deep: {
        unchanged: 10,
        added: 'hello'
      }
    })
  });
});

describe('isModifiedObject()', () => {
  const tests = [{
    diff: 'foo',
    result: false
  }, {
    diff: { __old: 'test', __new: 'replacement', foo: 'bar' },
    result: false
  }, {
    diff: { __old: 'test' },
    result: false
  }, {
    diff: { __new: 'replacement' },
    result: false
  }, {
    diff: { __old: 'test', __new: 'replacement' },
    result: true
  }];

  it('returns `true` if diff is an object and contains exactly `__old` and `__new` keys', () => {
    tests.forEach(({ diff, result }) => expect(util.isModifiedObject(diff)).to.equal(result));
  })
});

describe('typeOf', () => {
  const tests = [{
    value: null,
    result: 'null'
  }, {
    value: undefined,
    result: 'null'
  }, {
    value: 'test',
    result: 'string'
  }, {
    value: 12,
    result: 'number'
  }, {
    value: false,
    result: 'boolean'
  }, {
    value: ['a', 'b'],
    result: 'array'
  }, {
    value: { foo: 'bar' },
    result: 'object'
  }];

  it(`returns string representation of value's type`, () => {
    tests.forEach(({ value, result }) => expect(util.typeOf(value)).to.equal(result));
  });
});

describe('isModifiedArray', () => {
  const tests = [{
    diff: 'test',
    result: false
  }, {
    diff: [[], []],
    result: false
  }, {
    diff: [[' '], ['+', 'addedElement']],
    result: true
  }, {
    diff: [['+', 'addedElement']],
    result: true
  }, {
    diff: [['-', 'deletedElement']],
    result: true
  }];

  it('returns `true` if diff is an array with changed elements', () => {
    tests.forEach(({ diff, result }) => expect(util.isModifiedArray(diff)).to.equal(result));
  });
});

describe('hasPath', () => {
  const tests = [{
    path: ['counter'],
    result: true
  }, {
    path: ['counter', 'value'],
    result: true
  }, {
    path: ['counter', 'x'],
    result: false
  }, {
    path: ['x'],
    result: false
  }, {
    path: ['x', 'y'],
    result: false
  }];

  it('returns `true` if object has its own property at `path`', () => {
    const obj = {
      counter: {
        value: 10
      }
    };

    tests.forEach(({ path, result }) => expect(util.hasPath(path, obj)).to.equal(result, path.join('.')));
  });
});

describe('deepPick', () => {
  const data = {
    loading: false,
    counter: {
      value: 10,
      step: 1,
      history: {
        xs: ['a', 'b']
      }
    }
  };

  const tests = [{
    paths: [['counter']],
    result: {
      counter: {
        value: 10,
        step: 1,
        history: {
          xs: ['a', 'b']
        }
      }
    }
  }, {
    paths: [['counter', 'history']],
    result: {
      counter: {
        history: {
          xs: ['a', 'b']
        }
      }
    }
  }, {
    paths: [
      ['counter', 'history'],
      ['counter', 'step']
    ],
    result: {
      counter: {
        step: 1,
        history: {
          xs: ['a', 'b']
        }
      }
    }
  }];

  it('picks `paths` from `data`', () => {
    tests.forEach(({ paths, result }) => expect(util.deepPick(data, paths)).to.deep.equal(result));
  });
});
