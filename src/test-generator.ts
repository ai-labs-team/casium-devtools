import { GenericObject } from 'casium';
import * as hjson from 'hjson';
import { any, concat, head, keys, mergeWith, pipe, uniq } from 'ramda';

import { SerializedMessage, SerializedCommand } from './instrumenter';
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
const countConsecutive = (list: (string | null)[]) => {
  const result: [string, number][] = [];

  for (let i = 0, j = 0; i < list.length; i += 1) {
    const current = list[i];
    const next = list[i + 1];

    if (!result[j]) {
      result[j] = [current || '', 0];
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
  ];
}

const expectCommands = (pairs: MessageTracePair[]) => {
  const commands = pairs
    .filter(hasCommand)
    .map(([msg]) => (msg.commands as SerializedCommand[]).map(([name, data]) =>
      `    new ${name}(${toJsVal(data)}),`
    ));

  return commands.length ? [
    `  expect(commands).to.deep.equal([`,
    ...commands,
    `  ]);`,
    ''
  ] : [];
}

const mergeUniquePaths = mergeWith(pipe(concat, uniq as any));

/**
 * Generates textual unit test code, based on the content of a list of Messages:
 *
 * - Test 'setup' is based upon the initial state given.
 * - Test 'assertion' is based upon the final state given.
 * - Dependency trace information is used determine the relevant data to use for
     setup and assertion.
 */
export const generateUnitTest = (messages: SerializedMessage[], initialState: GenericObject, finalState: GenericObject, traces: DependencyTrace[]) => {
  const aggregateTrace = traces.length ? traces.reduce(mergeUniquePaths, {
    model: [],
    relay: [],
    message: []
  } as DependencyTrace) : undefined;

  if (!messages.length) {
    return '';
  }

  const pairs = messages.map((message, index) => ([message, traces[index]])) as MessageTracePair[];

  const [firstMsg] = head(pairs) as MessageTracePair;

  /**
   * When there is no dependency trace available for relay properties accessed,
   * then use the presence of relay data in the first message to determine if it
   * should be displayed.
   */
  const relayArg = keys(firstMsg.relay).length > 0 && (!aggregateTrace || aggregateTrace.relay.length) ?
    `, ${toJsVal({ relay: aggregateTrace ? deepPick(firstMsg.relay, aggregateTrace.relay) : firstMsg.relay })}` : '';

  const tracedStates = (
    aggregateTrace
      ? {
          initial: deepPick(initialState, aggregateTrace.model),
          final: deepPick(finalState, aggregateTrace.model)
        }
      : {
          initial: initialState,
          final: finalState
        }
  );

  return [
    `it('should respond to ${messageNames(pairs)} messages', () => {`,
    `  const container = isolate(${firstMsg.name}${relayArg});`,
    `  container.push(${toJsVal(tracedStates.initial)});`,
    ...containerDispatch(pairs),
    '',
    ...expectCommands(pairs),
    `  expect(container.state()).to.deep.equal(${toJsVal(tracedStates.final)});`,
    `});`
  ].join('\n');
}
