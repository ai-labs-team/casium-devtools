import * as hjson from 'hjson';
import { any, head, keys, last, lensPath, set } from 'ramda';

import { SerializedMessage, Command } from './messaging';
import { DependencyTrace } from './dependency-trace';
import { deepPick } from './util';

export type MessageTracePair = [SerializedMessage, DependencyTrace | undefined];

const FORMATTING_OPTIONS: hjson.SerializeOptions = {
  condense: 80,
  quotes: 'min',
  multiline: 'std',
  separator: true,
  space: 2,
  bracesSameLine: true
}

const toJsVal = (val: any, indent = 2) =>
  hjson.stringify(val, FORMATTING_OPTIONS)
    .split('\n')
    .map((str, i) => i === 0 ? str : (' ').repeat(indent) + str)
    .join('\n');

/**
 * Counts the consecutive entries in an array, eg `['foo', 'foo', 'bar', 'baz']`
 * becomes [['foo', 2], ['bar', 1], ['baz', 1]]`
 */
const countConsecutive = (list: string[]) => {
  const result: [string, number][] = [];

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

const messageNames = (pairs: MessageTracePair[]) =>
  countConsecutive(pairs.map(([msg]) => msg.message))
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

const dispatchArg = ([msg, trace]: MessageTracePair) =>
  `new ${msg.message}(${toJsVal(trace ? deepPick(msg.data || {}, trace.message) : msg.data)})`;

const hasCommand = ([msg]: MessageTracePair) =>
  !!(msg.commands && msg.commands.length);

const containerDispatch = (pairs: MessageTracePair[]) => {
  const cmdAssign = any(hasCommand, pairs) ? `const commands = ` : '';

  if (pairs.length < 2) {
    return [
      `  ${cmdAssign}container.dispatch(${dispatchArg(pairs[0])});`
    ];
  }

  const args = pairs.map((pair, index) => (
    `    ${dispatchArg(pair)}${index < pairs.length - 1 ? ',' : ''}`
  ));

  return [
    `  ${cmdAssign}container.dispatch(`,
    ...args,
    `  );`
  ]
}

const expectCommands = (pairs: MessageTracePair[]) => {
  const commands = pairs
    .filter(hasCommand)
    .map(([msg]) => (msg.commands as Command[]).map(([name, data]) =>
      `    new ${name}(${toJsVal(data)}),`
    ));

  return commands.length ? [
    `  expect(commands).to.deep.equal([`,
    ...commands,
    `  ]);`,
    ''
  ] : [];
}

export const generateUnitTest = (messages: SerializedMessage[], traces: DependencyTrace[]) => {
  const pairs = messages.map((message, index) => ([message, traces[index]])) as MessageTracePair[];

  const [firstMsg, firstTrace] = head(pairs) as MessageTracePair;
  const [lastMsg] = last(pairs) as MessageTracePair;

  const relayArg = keys(firstMsg.relay).length ?
    `, ${toJsVal({ relay: firstTrace ? deepPick(firstMsg.relay, firstTrace.relay) : firstMsg.relay })}` : '';

  const initialState = toJsVal(firstMsg.prev);
  const finalState = toJsVal(set(lensPath(lastMsg.path), lastMsg.next, lastMsg.prev));

  return [
    `it('should respond to ${messageNames(pairs)} messages', () => {`,
    `  const container = isolate(${firstMsg.name}${relayArg});`,
    `  container.push(${initialState});`,
    ...containerDispatch(pairs),
    '',
    ...expectCommands(pairs),
    `  expect(container.state()).to.deep.equal(${finalState});`,
    `});`
  ].join('\n');
}
