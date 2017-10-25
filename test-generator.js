import { keys, lensPath, view, set, traverse } from 'ramda';
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

export const generateUnitTest = (msg) => {
  if (!msg.data) {
    return null;
  }
  const toJsVal = (val, indent = 2) => hjson.stringify(val, formatOpts)
    .split('\n')
    .map((str, i) => i === 0 ? str : '  ' + str)
    .join('\n');

  const delegateLens = lensPath(msg.path);
  var prevState = toJsVal(view(delegateLens, msg.prev));
  var msgData = keys(msg.data).length ? toJsVal(msg.data) : '';
  var newState = toJsVal(msg.next);
  var relay = toJsVal(msg.relay);
  var hasCommands = msg.commands && msg.commands.length;
  var runPrefix = hasCommands ? `const commands = ` : '';

  console.log(traverse(diff(view(delegateLens, msg.prev), msg.next)));

  var lines = [`it('should respond to ${msg.message} messages', () => {`];
  lines.push(`  isolate(${msg.name}, { relay : ${relay} })`);
  lines.push(`  container.push(${hasCommands ? prevState : prevState});`);
  lines.push(`  ${runPrefix}container.dispatch(new ${msg.message}(${msgData}));`);
  lines.push('');
  lines.push(`  expect(container.state()).to.deep.equal(${newState});`);

  if (hasCommands) {
    lines.push(`  expect(commands).to.deep.equal([`);
    lines = lines.concat(msg.commands.map(([name, data]) => `    new ${name}(${toJsVal(data)}),`));
    lines.push(`  ]);`);
  }

  lines.push('})');

  return lines.join('\n');
}
