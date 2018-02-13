import {
  pipe, lensPath, set, curry, merge, replace, propEq,
  keys, values, map, identity, equals, isNil, where, contains,
  head, last, slice, concat
} from 'ramda';

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import titleCase from 'title-case';
import { diff } from 'json-diff';
import FontAwesome from 'react-fontawesome';
import { ObjectInspector } from 'react-inspector';
import { generateUnitTest } from './test-generator';
import { runDependencyTrace } from './dependency-trace';
import { toPath, download, disableEvent, handleDrop } from './util';
import { e, div, span, button, nodeRenderer, diffNodeMapper, formatDate, timeSince } from './view';

const renderMessages = (messages, active, toggleTime, dependencyTrace) => {
  if (messages.length === 0) {
    return [];
  }

  if (messages.length === 1) {
    return renderMessage(head(messages), active, toggleTime, dependencyTrace);
  }

  return renderMessageRange(messages);
}

const renderMessage = ({ name, ts, data, commands, prev, next, path, relay }, active, toggleTime, dependencyTrace) => {
  var items = !data ? [] : [
    div({ className: 'panel-heading first panel-label', key: 'heading-msg' }, [
      div({ className: 'panel-heading-side time-toggle', onClick: toggleTime }, [
        `${name} @ ${(active.relativeTime && timeSince || formatDate)(ts)}`
      ]),
      'Message'
    ]),
    div({}, e(ObjectInspector, { data, expandLevel: 1 }))
  ];
  const nextData = set(lensPath(path), next, prev), diffMap = diff(prev, nextData);

  if (commands && commands.length && commands.filter(identity).length) {
    items.push(div({ className: 'panel-heading panel-label', key: 'heading-cmd' }, 'Commands'));
    commands.filter(identity).forEach(cmd => {
      items.push(div({ className: 'panel-label' }, cmd[0]));
      items.push(div({}, e(ObjectInspector, { data: cmd[1], expandLevel: 1 })))
    });
  }

  const views = {
    diffState: [
      div({ className: 'panel-heading panel-label' }, 'Model Changes'),
      diffMap === undefined ?
        e('em', { style: { color: 'lightgray' } }, ['No changes']) :
        div({}, e(ObjectInspector, { data: diffMap, expandLevel: 3, nodeRenderer, mapper: diffNodeMapper }))
    ],
    nextState: [
      div({ className: 'panel-heading panel-label' }, 'New Model'),
      div({}, e(ObjectInspector, { data: nextData, expandLevel: 2 })),
    ],
    prevState: [
      div({ className: 'panel-heading panel-label' }, 'Previous Model'),
      div({}, e(ObjectInspector, { data: prev, expandLevel: 2 })),
    ],
    dependencies: [
      ...renderDependencyTrace(dependencyTrace, 'model'),
      ...renderDependencyTrace(dependencyTrace, 'message'),
      ...renderDependencyTrace(dependencyTrace, 'relay'),
    ]
  }

  const viewKeys = ['diffState', 'nextState', 'prevState', 'dependencies'];

  for (var i = 0; i < viewKeys.length; i++) {
    if (active[viewKeys[i]]) items = items.concat(views[viewKeys[i]]);
  }

  return keys(relay).length === 0 ? items : items.concat([
    div({ className: 'panel-heading panel-label', key: 'relay' }, 'Relay'),
    div({}, e(ObjectInspector, { data: relay, expandLevel: 2 })),
  ]);
}

const renderMessageRange = (messages) => {
  const firstMsg = head(messages), lastMsg = last(messages);
  const finalData = set(lensPath(lastMsg.path), lastMsg.next, lastMsg.prev), diffMap = diff(firstMsg.prev, finalData);

  return [
    div({ className: 'panel-heading first panel-label', key: 'heading-diff' }, 'Aggregate Model Changes'),
    diffMap === undefined ?
      e('em', { style: { color: 'lightgray' } }, 'No changes') :
      div({}, e(ObjectInspector, { data: diffMap, expandLevel: 3, nodeRenderer, mapper: diffNodeMapper }))
  ];
}

const renderDependencyTrace = (trace, key) => {
  const title = div({ className: 'panel-heading panel-label' }, `Dependencies - ${titleCase(key)}`);

  if (!trace || !trace[key]) {
    return [
      title,
      e('em', { style: { color: 'lightgray' } }, 'Waiting for data')
    ];
  }

  if (!trace[key].length) {
    return [
      title,
      e('em', { style: { color: 'lightgray' } }, 'No dependencies')
    ];
  }

  const paths = trace[key].map(path => e('code', { className: 'dependency-trace-path' }, path.join('.')));

  return [
    title,
    ...paths
  ];
}

/**
 * Extend an existing message selection (`selected`) based on a list of all
 * messages (`messages`) and a newly selected message (`message`).
 */
const extendSelection = (messages, selected, msg) => {
  if (!selected.length) {
    return [msg];
  }

  const msgIdx = messages.indexOf(msg);
  const lastIdx = messages.indexOf(last(selected));

  if (msgIdx > lastIdx) {
    // Message is after end of selection; gather messages from last selected to message and append to selection
    const newMessages = slice(lastIdx + 1, msgIdx + 1, messages);
    return concat(selected, newMessages);
  }

  const firstIdx = messages.indexOf(head(selected));

  if (msgIdx < firstIdx) {
    // Message is before start of selection; gather messages from message to first selected and prepend to selection
    const newMessages = slice(msgIdx, firstIdx, messages);
    return concat(newMessages, selected);
  }

  // Message is within selection; gather first selected to message
  return slice(firstIdx, msgIdx + 1, messages);
}

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      selected: [],
      dependencyTrace: undefined,
      unitTest: undefined,
      active: {
        timeTravel: false,
        clearOnReload: false,
        unitTest: false,
        diffState: true,
        nextState: true,
        prevState: false,
        relativeTime: false,
        replay: false,
        dependencies: true
      },
      haltForReplay: false,
    };
  }

  componentWillMount() {
    window.LISTENERS.push([
      where({ from: equals('Arch'), state: isNil }),
      message => !this.state.haltForReplay && this.setState({ messages: this.state.messages.concat(message) }),
    ]);

    window.LISTENERS.push([
      where({ from: equals('ArchDevToolsPanel'), state: isNil }),
      message => this.state.haltForReplay && this.setState({ haltForReplay: false }),
    ]);

    window.LISTENERS.push([
      where({ from: equals('CasiumDevToolsPageScript'), state: equals('initialized') }),
      () => this.state.active.replay && this.setState({ haltForReplay: true }),
      () => this.state.active.clearOnReload && this.clearMessages(),
      () => this.state.active.replay && window.messageClient({ selected: this.state.selected[0] }),
    ]);

    window.FLUSH_QUEUE();
  }

  setActive(key, state) {
    this.setState({ active: merge(this.state.active, { [key]: state }) });
  }

  toggleActive(key) {
    const nextValue = !this.state.active[key];
    this.setActive(key, nextValue);
    return nextValue;
  }

  clearMessages() {
    this.setState({
      messages: (window.MESSAGES = []),
      selected: [],
      haltForReplay: false,
      active: merge(this.state.active, { timeTravel: false, replay: false })
    });
  }

  render() {
    var { messages, selected, active } = this.state;

    return div({ className: 'container', key: 'container' }, [
      div({ className: 'panel-tools', key: 'tools' }, [
        span({ style: { display: 'inline-block', minWidth: '225px' } }, [
          e(FontAwesome, {
            key: 'clear',
            name: 'ban',
            title: 'Clear Messages / ⌘ — Toggle Clear on Reload',
            className: 'tool-button clear-messages-button' + (active.clearOnReload ? ' on' : ''),
            // @TODO: Cache previous model state before clearing
            onClick: (e) => {
              (e.metaKey || e.ctrlKey) ? this.toggleActive('clearOnReload') : this.clearMessages();
            }
          }),
          e(FontAwesome, {
            key: 'time',
            name: 'clock-o',
            title: 'Toggle Time Travel',
            className: 'tool-button time-travel-button' + (active.timeTravel ? ' on' : ''),
            onClick: () => this.toggleActive('timeTravel')
          }),
          e(FontAwesome, {
            key: 'unit-test',
            name: 'check-circle-o',
            title: 'Toggle Unit Test',
            className: 'tool-button unit-test-button' + (active.unitTest ? ' on' : ''),
            onClick: () => {
              if (this.toggleActive('unitTest')) {
                generateUnitTest(this.state.selected[0])
                  .then(unitTest => this.setState({ unitTest }));
              } else {
                this.setState({ unitTest: undefined });
              }
            }
          }),
          e(FontAwesome, {
            key: 'save',
            name: 'file-text-o',
            title: 'Save Message Log',
            className: 'tool-button save-msg-button',
            onClick: () => {
              download({ data: JSON.stringify(this.state.messages, null, 2), filename: 'message-log.json' });
            }
          }),
          selected.length ? e(FontAwesome, {
            key: 'replay',
            name: 'replay',
            title: 'Replay Message on Reload',
            className: 'tool-button fa fa-play-circle-o' + (active.replay ? ' on' : ''),
            onClick: () => {
              selected.length && this.toggleActive('replay');
            }
          }) : null
        ]),

        span({ className: 'panel-tools-right' }, [
          span({ className: 'button-group' }, [
            button({
              className: 'first' + (this.state.active.prevState ? ' selected' : ''),
              onClick: () => this.toggleActive('prevState')
            }, [
              '{', e(FontAwesome, { name: 'arrow-circle-o-left', title: 'View Previous State' }), '}'
            ]),

            button({
              className: (this.state.active.diffState ? ' selected' : ''),
              onClick: () => this.toggleActive('diffState')
            }, [
              '{', span({ style: { color: 'rgb(100, 150, 150)' } }, '+'), '|', span({ style: { color: 'rgb(150, 100, 100)' } }, '-'), '}'
            ]),

            button({
              className: 'last' + (this.state.active.nextState ? ' selected' : ''),
              onClick: () => this.toggleActive('nextState')
            }, [
              '{', e(FontAwesome, { name: 'arrow-circle-o-right', title: 'View Next State' }), '}'
            ])
          ]),
        ])
      ]),

      div({ className: 'panel-container', key: 'panel' }, [
        div({ className: 'panel left control-deck', key: 'controls' }, [
          div({ className: 'panel-list', key: 'message-list' },
            messages.map(msg => div({
              key: msg.id,
              className: 'panel-item' + (contains(msg, selected) ? ' selected' : ''),
              onClick: (e) => {
                const nextSelection = e.shiftKey ? extendSelection(messages, selected, msg) : [msg];
                this.setState({ selected: nextSelection });

                active.timeTravel && window.messageClient({ selected: msg });

                if (active.dependencies) {
                  runDependencyTrace(msg)
                    .then(dependencyTrace => this.setState({ dependencyTrace }));
                }

                if (active.unitTest) {
                  generateUnitTest(msg)
                    .then(unitTest => this.setState({ unitTest }));
                }
              }
            }, msg.message))
          )]
        ),

        div({ className: 'panel content with-heading', key: 'panel-head' }, !selected.length ? [] : [
          div({
            className: 'unit-test-content' + (active.unitTest ? ' on' : ''),
            key: 'test-content'
          }, this.state.unitTest),
          ...renderMessages(selected, this.state.active, this.toggleActive.bind(this, 'relativeTime'), this.state.dependencyTrace)
        ])
      ])
    ]);
  }
}

window.RENDER = () => ReactDOM.render(React.createElement(App), document.getElementById('app'));
window.RENDER();
