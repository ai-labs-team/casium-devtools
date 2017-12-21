import {
  pipe, lensPath, set, identity, curry, merge, replace, propEq,
  keys, values, map, identity, equals, isNil, where
} from 'ramda';

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { diff } from 'json-diff';
import FontAwesome from 'react-fontawesome';
import { ObjectInspector } from 'react-inspector';
import { generateUnitTest } from './test-generator';
import { toPath, download, disableEvent, handleDrop } from './util';
import { e, div, span, button, nodeRenderer, diffNodeMapper, formatDate, timeSince } from './view';

const renderMessage = ({ name, ts, data, commands, prev, next, path, relay }, active, toggleTime) => {
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
    ]
  }

  const viewKeys = ['diffState', 'nextState', 'prevState'];

  for (var i = 0; i < viewKeys.length; i++) {
    if (active[viewKeys[i]]) items = items.concat(views[viewKeys[i]]);
  }

  return keys(relay).length === 0 ? items : items.concat([
    div({ className: 'panel-heading panel-label', key: 'relay' }, 'Relay'),
    div({}, e(ObjectInspector, { data: relay, expandLevel: 2 })),
  ]);
}

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      selected: null,
      active: {
        timeTravel: false,
        clearOnReload: false,
        unitTest: false,
        diffState: true,
        nextState: true,
        prevState: false,
        relativeTime: false,
        replay: false
      }
    };
  }

  componentWillMount() {
    window.LISTENERS.push([
      where({ from: equals('Arch'), state: isNil }),
      message => this.setState({ messages: this.state.messages.concat(message) })
    ]);

    window.LISTENERS.push([
      where({ from: equals('CasiumDevToolsPageScript'), state: equals('initialized') }),
      () => this.state.active.clearOnReload && this.clearMessages()
    ]);

    window.FLUSH_QUEUE();
  }

  setActive(key, state) {
    this.setState({ active: merge(this.state.active, { [key]: state }) });
  }

  toggleActive(key) {
    this.setActive(key, !this.state.active[key]);
  }

  clearMessages() {
    this.setState({
      messages: (window.MESSAGES = []),
      selected: null,
      active: merge(this.state.active, { timeTravel: false })
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
            onClick: () => this.toggleActive('unitTest')
          }),
          e(FontAwesome, {
            key: 'save',
            name: 'file-text-o',
            title: 'Save Message Log',
            className: 'tool-button save-msg-button',
            onClick: () => {
              download({ data: JSON.stringify(this.state.messages, null, 2), filename: 'message-log.json' });
            }
          })
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
          ])
        ])
      ]),

      div({ className: 'panel-container', key: 'panel' }, [
        div({ className: 'panel left control-deck', key: 'controls' }, [
          div({ className: 'panel-list', key: 'message-list' },
            messages.map(msg => div({
              key: msg.id,
              className: 'panel-item' + (msg === selected ? ' selected' : ''),
              onClick: () => {
                this.setState({ selected: msg });
                this.setActive('unitTest', !msg.data ? false : active.unitTest);
                active.timeTravel && window.messageClient({ selected: msg });
              }
            },
            msg.message))
          )]
        ),

        div({ className: 'panel content with-heading', key: 'panel-head' }, !selected && [] || [
          div({
            className: 'unit-test-content' + (active.unitTest ? ' on' : ''),
            key: 'test-contet'
          }, generateUnitTest(selected)),
          ...renderMessage(selected, this.state.active, this.toggleActive.bind(this, 'relativeTime'))
        ])
      ])
    ]);
  }
}

window.RENDER = () => ReactDOM.render(React.createElement(App), document.getElementById('app'));
window.RENDER();
