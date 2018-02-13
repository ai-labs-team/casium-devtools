import {
  anyPass, has, keys, lensPath, view, set, traverse, merge, is, zipObj, map,
  pipe, values, filter, replace, slice, startsWith, tail
} from 'ramda';
import hjson from 'hjson';
import { diff } from 'json-diff';
import { isModifiedObject, isModifiedArray } from './util';
import { runDependencyTrace } from './dependency-trace';

const formatOpts = {
  condense: 80,
  quotes: 'min',
  multiline: 'std',
  separator: true,
  space: 2,
  bracesSameLine: true
};

const toJsVal = (val, indent = 2) => hjson.stringify(val, formatOpts)
  .split('\n')
  .map((str, i) => i === 0 ? str : (' ').repeat(indent) + str)
  .join('\n');

const hasPath = (path, data) => {
  const key = path[0];

  if (!has(key, data)) {
    return false;
  }

  const value = data[key];
  if (is(Object, value)) {
    return hasPath(tail(path), value);
  }

  return true;
}

const deepPick = (data, paths) =>
  paths
    .sort((a, b) => a.length > b.length)
    .reduce((result, path) => {
      if (!hasPath(path, data)) {
        return result;
      }

      const lens = lensPath(path);
      const value = view(lens, data);

      return set(lens, value, result);
    }, {});

export const generateUnitTest = (msg) => {
  const { data, commands, prev, path, next, relay, message, name } = msg;

  if (!data) {
    return Promise.resolve();
  }

  return runDependencyTrace(msg)
    .then(trace => {
      const hasCommands = commands && commands.length;
      const delegateLens = lensPath(path);
      const unformattedPrev = view(delegateLens, prev);
      const prevState = toJsVal(deepPick(unformattedPrev, trace.model));
      const msgData = keys(data).length ? toJsVal(deepPick(data, trace.message)) : '';
      const newState = toJsVal(next);
      const formattedRelay = keys(relay).length ? `, { relay: ${toJsVal(deepPick(relay, trace.relay))} }` : '';
      const runPrefix = hasCommands ? `const commands = ` : '';

      let lines = [`it('should respond to ${message} messages', () => {`];
      lines.push(`  const container = isolate(${name}${formattedRelay})`);
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
    });
}
