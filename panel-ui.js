import { lensPath, set } from 'ramda';
import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import { ObjectInspector } from 'react-inspector';

const e = (el, props, children = []) => React.createElement(el, props, children);
const div = (props, children = []) => e('div', props, children);

const formatMessage = (msg) => {
  var copy = Object.assign({}, msg);
  ['value', 'checked'].forEach(key => {
    if (copy[key] === null || copy[key] === undefined) delete copy[key];
  });
  return copy;
};

const renderMessage = ({ data, commands, prev, next, path }) => {
  var items = [
    div({ className: 'panel-heading panel-label' }, 'Message'),
    div({}, e(ObjectInspector, { data: formatMessage(data), expandLevel: 1 }))
  ];

  if (commands && commands.length) {
    items.push(div({ className: 'panel-heading panel-label' }, 'Commands'));
    commands.forEach(cmd => {
      items.push(div({ className: 'panel-label' }, cmd[0]));
      items.push(div({}, e(ObjectInspector, { data: cmd[1], expandLevel: 1 })))
    });
  }

  return items.concat([
    div({ className: 'panel-heading panel-label' }, 'State'),
    div({}, e(ObjectInspector, { data: set(lensPath(path), next, prev), expandLevel: 1 })),
    div({ className: 'panel-heading panel-label' }, 'Previous State'),
    div({}, e(ObjectInspector, { data: prev, expandLevel: 1 })),
  ]);
}

const generateUnitTest = (msg) => {
  var prevState = JSON.stringify(msg.prev);
  var msgData = Object.keys(msg.data).length ? JSON.stringify(msg.data) : '';
  var newState = JSON.stringify(msg.next);
  var hasCommands = msg.commands && msg.commands.length;
  var runPrefix = hasCommands ? `const commands = ` : '';

  var lines = [`it('should respond to ${msg.message} messages', () => {`];
  lines.push(`  container.push(${prevState});`);
  lines.push(`  ${runPrefix}container.dispatch(new ${msg.message}(${msgData}));`);
  lines.push('');
  lines.push(`  expect(container.state()).to.deep.equal(\n    ${newState}\n  );`);

  if (hasCommands) {
    lines.push(`  expect(commands).to.deep.equal([`);
    lines = lines.concat(msg.commands.map(([name, data]) => `    new ${name}(${JSON.stringify(data)}),`));
    lines.push(`  ]);`);
  }

  lines.push('})');

  return lines.join('\n');
}

class App extends Component {

  constructor(props) {
    super(props);
    this.state = { messages: [], selected: null, showUnitTest: false };
  }

  componentWillMount() {
    window.LISTENERS.push(messages => this.setState({ messages }));
  }

  render() {
    var { messages, selected, showUnitTest } = this.state;

    return div({ className: 'container' }, [
      div({ className: 'panel left control-deck'}, [
        div({
          className: 'panel-heading clear-messages-button',
          onClick: () => {
            this.setState({ messages: [] });
            window.MESSAGES = [];
          }
        }, 'Clear Messages'),
        div({ className: 'panel-list' },
          messages.map((msg, i) => div({
            key: i,
            className: 'panel-item' + (msg === selected ? ' selected' : ''),
            onClick: () => {
              this.setState({ selected: msg });
              window.messageClient({ selected: msg });
            }
          },
          msg.message))
        )]
      ),

      div({ className: 'panel content with-heading' }, !selected && [] || renderMessage(selected).concat(
        div({
          title: 'Show unit test',
          className: 'unit-test-button',
          onClick: () => this.setState({ showUnitTest: !showUnitTest })
        }, '✔')
      ).concat(!showUnitTest && [] || div({ className: 'unit-test-content' }, generateUnitTest(selected))))
    ]);
  }
}

window.RENDER = () => ReactDOM.render(React.createElement(App), document.getElementById('app'));
window.RENDER();
