import {
  either, keys, lensPath, view, set, traverse, merge, is, zipObj,
  map, pipe, values, filter, replace, slice, startsWith
} from 'ramda';
import hjson from 'hjson';
import { diff } from 'json-diff';
import { isModifiedObject, isModifiedArray } from './util';


const formatOpts = {
  condense: 80,
  quotes: 'min',
  multiline: 'std',
  separator: true,
  space: 2,
  bracesSameLine: true
};

const leftHandDiff = (val) => {

  if (isModifiedObject(val)) {
    return val.__old;
  }

  if (isModifiedArray(val)) {
    return val.filter(either(startsWith('~'), startsWith('-'))).map(slice(1, Infinity));
  }

  if (is(Object, val)) {
    const nonAddedKeys = filter(s => !s.endsWith('__added'), keys(val));
    const deepDive = pipe(map(k => val[k]), map(leftHandDiff));
    const newKeys = map(replace(/__deleted$/, ''), nonAddedKeys);
    return zipObj(newKeys, deepDive(nonAddedKeys));
  }

  if (is(Array, val)) {
    return map(leftHandDiff, val);
  }

  return val;
}

export const generateUnitTest = ({ data, commands, prev, path, next, relay, message, name }) => {
  if (!data) {
    return null;
  }
  const toJsVal = (val, indent = 2) => hjson.stringify(val, formatOpts)
    .split('\n')
    .map((str, i) => i === 0 ? str : (' ').repeat(indent) + str)
    .join('\n');

  const hasCommands = commands && commands.length;
  const delegateLens = lensPath(path);
  const unformattedPrev = hasCommands ? view(delegateLens, prev) : leftHandDiff(diff(view(delegateLens, prev), next));
  const prevState = toJsVal(unformattedPrev);
  const msgData = keys(data).length ? toJsVal(data) : '';
  const newState = toJsVal(next);
  const formattedRelay = toJsVal(relay);
  const runPrefix = hasCommands ? `const commands = ` : '';

  let lines = [`it('should respond to ${message} messages', () => {`];
  lines.push(`  const container = isolate(${name}, { relay : ${formattedRelay} })`);
  lines.push(`  container.push(${prevState});`);
  lines.push(`  ${runPrefix}container.dispatch(new ${message}(${msgData}));`);
  lines.push('');
  lines.push(`  expect(container.state()).to.deep.equal(${newState});`);

  if (hasCommands) {
    lines.push(`  expect(commands).to.deep.equal([`);
    lines = lines.concat(commands.map(([name, data]) => `    new ${name}(${toJsVal(data)}),`));
    lines.push(`  ]);`);
  }

  lines.push('})');

  return lines.join('\n');
}
