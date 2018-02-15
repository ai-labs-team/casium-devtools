import {
  any, has, head, keys, last, lensPath, view, set, traverse, merge, is,
  zipObj, map, pipe, values, filter, pluck, replace, slice, startsWith, tail
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

/**
 * Counts the consecutive entries in an array, eg `['foo', 'foo', 'bar', 'baz']`
 * becomes [['foo', 2], ['bar', 1], ['baz', 1]]`
 */
const countConsecutive = (list) => {
  const result = [];

  for (let i = 0, j = 0; i < list.length; i += 1) {
    const current = list[i];
    const next = list[i + 1];

    if (!result[j]) {
      result[j] = [current, 0];
    }

    result[j][1] += 1;

    if (current !== next) {
      j += 1;
    }
  }

  return result;
}

const messageNames = (msgTracePairs) =>
  countConsecutive(msgTracePairs.map(part => part.msg.message))
    .reduce((result, [message, count], index, list) => {
      const append = count > 1 ? `${message} (x${count})` : message;

      if (index === 0) {
        return append;
      }

      if (index === list.length - 1) {
        return `${result} and ${append}`;
      }

      return `${result}, ${append}`;
    }, '');

const dispatchArg = ({ trace, msg }) => `new ${msg.message}(${toJsVal(deepPick(msg.data, trace.message))})`;

const hasCommand = ({ msg }) => msg.commands && msg.commands.length;

const containerDispatch = (msgTracePairs) => {
  const cmdAssign = any(hasCommand, msgTracePairs) ? `const commands = ` : '';

  if (msgTracePairs.length < 2) {
    return [
      `  ${cmdAssign}container.dispatch(${dispatchArg(msgTracePairs[0])});`
    ];
  }

  const args = msgTracePairs.map((msgTracePair, index) => (
    `    ${dispatchArg(msgTracePair)}${index < msgTracePairs.length - 1 ? ',' : ''}`
  ));

  return [
    `  ${cmdAssign}container.dispatch(`,
    ...args,
    `  );`
  ]
}

const expectCommands = (msgTracePairs) => {
  const commands = msgTracePairs
    .filter(hasCommand)
    .map(({ msg }) => msg.commands.map(([name, data]) => `    new ${name}(${toJsVal(data)}), `));

  return commands.length ? [
    `  expect(commands).to.deep.equal([`,
    ...commands,
    `  ]);`,
    ''
  ] : [];
}

export const generateUnitTest = (messages) => {
  return Promise.all(messages.map(runDependencyTrace))
    .then(traces => traces.map((trace, i) => {
      return {
        msg: messages[i],
        trace
      }
    }))
    .then(msgTracePairs => {
      const { msg: firstMsg, trace: firstTrace } = head(msgTracePairs), { msg: lastMsg } = last(msgTracePairs);

      const relayArg = keys(firstMsg.relay).length ?
        `, ${toJsVal({ relay: deepPick(firstMsg.relay, firstTrace.relay) })}` : '';

      const initialState = toJsVal(firstMsg.prev);
      const finalState = toJsVal(set(lensPath(lastMsg.path), lastMsg.next, lastMsg.prev));

      const commandAssign = any(hasCommand, msgTracePairs) ? `const commands = ` : '';

      return [
        `it('should respond to ${messageNames(msgTracePairs)} messages', () => {) `,
        `  const container = isolate(${firstMsg.name}${relayArg}); `,
        `  container.push(${initialState}); `,
        ...containerDispatch(msgTracePairs),
        '',
        ...expectCommands(msgTracePairs),
        `  expect(container.state()).to.deep.equal(${finalState}); `,
        `}); `
      ].join('\n');
    })
}
