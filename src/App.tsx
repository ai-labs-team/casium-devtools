import * as React from 'react';

import { GenericObject } from 'casium/core';
import * as FontAwesome from 'react-fontawesome';
import { concat, contains, equals, head, last, isNil, merge, pipe, prop, slice, takeWhile, where, nth } from 'ramda';

import { SerializedMessage } from './instrumenter';
import { download, applyDeltas } from './util';
import { importLog, readFile, upload } from './import-log';
import { MessageView } from './MessageView';
import * as DragDrop from './dragdrop';

import 'font-awesome/scss/font-awesome.scss';
import './App.scss';

interface State {
  messages: SerializedMessage[];
  selected: SerializedMessage[];

  /**
   * Maintain the initial state; this is initially an empty object, but should
   * be set to the 'next' state of the last message before the message history
   * is cleared.
   */
  initial: GenericObject;

  /**
   * Maintain the state determined immediately before the selected message by
   * applied each preceeding message's delta
   */
  replayedDeltas: GenericObject;

  haltForReplay: boolean;

  active: {
    timeTravel: boolean;
    clearOnReload: boolean;
    unitTest: boolean;
    dependencyTrace: boolean;
    prevState: boolean;
    diffState: boolean;
    nextState: boolean;
    relativeTime: boolean;
    replay: boolean;
    showInit: boolean;
    showFilters: boolean;
  },
}

/**
 * Extend an existing message selection (`selected`) based on a list of all
 * messages (`messages`) and a newly selected message (`message`).
 */
const extendSelection = (messages: SerializedMessage[], selected: SerializedMessage[], msg: SerializedMessage) => {
  if (!selected.length) {
    return [msg];
  }

  const msgIdx = messages.indexOf(msg);
  const lastIdx = messages.indexOf(last(selected) as SerializedMessage);

  if (msgIdx > lastIdx) {
    // Message is after end of selection; gather messages from last selected to message and append to selection
    const newMessages = slice(lastIdx + 1, msgIdx + 1, messages);
    return concat(selected, newMessages);
  }

  const firstIdx = messages.indexOf(head(selected) as SerializedMessage);

  if (msgIdx < firstIdx) {
    // Message is before start of selection; gather messages from message to first selected and prepend to selection
    const newMessages = slice(msgIdx, firstIdx, messages);
    return concat(newMessages, selected);
  }

  // Message is within selection; gather first selected to message
  return slice(firstIdx, msgIdx + 1, messages);
}

/**
 * Returns messages from `messages` up to (but not including) the first selected
 * message from `selected`
 */
const messagesBeforeSelection = (messages: SerializedMessage[], selected: SerializedMessage[]) => {
  if (selected.length === 0) {
    return [];
  }

  return takeWhile(msg => msg.id !== selected[0].id, messages);
}

export class App extends React.Component<{}, State> {
  state: State = {
    messages: [],
    selected: [],
    replayedDeltas: {},
    initial: {},

    haltForReplay: false,

    active: {
      timeTravel: false,
      clearOnReload: false,
      unitTest: false,
      dependencyTrace: true,
      prevState: false,
      diffState: true,
      nextState: true,
      relativeTime: false,
      replay: false,
      showInit: false,
      showFilters: false
    }
  }

  componentWillMount() {
    window.LISTENERS.push([
      where({ from: equals('CasiumDevToolsInstrumenter'), state: isNil }),
      message => {
        if (!this.state.haltForReplay) {
          this.setState({ messages: this.state.messages.concat(message) });
        }
      }
    ]);

    window.LISTENERS.push([
      where({ from: equals('CasiumDevToolsPanel'), state: isNil }),
      message => this.state.haltForReplay && this.setState({ haltForReplay: false })
    ]);

    window.LISTENERS.push([
      where({ from: equals('CasiumDevToolsInstrumenter'), state: equals('initialized') }),
      () => this.state.active.replay && this.setState({ haltForReplay: true }),
      () => this.state.active.clearOnReload && this.clearMessages(),
      () => this.state.active.replay && window.messageClient({ selected: this.state.selected[0] }),
      /**
       * Notify the Instrumenter Backend(s) that the Panel is already initialized
       * if the inspected page was reloaded
       */
      () => window.messageClient({ state: 'initialized' })
    ]);

    /**
     * Notify the Instrumenter Backend(s) that the Panel was initialized if it
     * loaded *after* the inspected page
     */
    window.messageClient({ state: 'initialized' });
  }

  setActive<K extends keyof State['active']>(key: K, state: boolean) {
    this.setState({ active: merge(this.state.active, { [key]: state }) });
  }

  toggleActive<K extends keyof State['active']>(key: K) {
    const nextValue = !this.state.active[key];
    this.setActive(key, nextValue);

    return nextValue;
  }

  clearMessages() {
    const { active, initial, messages } = this.state;

    this.setState({
      messages: [],
      selected: [],
      replayedDeltas: {},
      initial: applyDeltas(initial, messages),
      haltForReplay: false,
      active: merge(active, { timeTravel: false, replay: false })
    });
  }

  render() {
    const { messages, selected, active, replayedDeltas } = this.state;

    return (
      <div
        className="container"
        onDrop={pipe(DragDrop.files, nth(0) as (fl: File[]) => File, this._importDropped)}
        onDragOver={DragDrop.allow}
      >

        <div className="panel-tools">
          <span style={{ display: 'inline-block', minWidth: '225px' }}>
            <FontAwesome
              key="clear"
              name="ban"
              title="Clear Messages / ⌘ — Toggle Clear on Reload"
              className={'tool-button clear-messages-button' + (active.clearOnReload ? ' on' : '')}
              onClick={e => {
                (e.metaKey || e.ctrlKey) ? this.toggleActive('clearOnReload') : this.clearMessages();
              }}
            />
            <FontAwesome
              key="time"
              name="clock-o"
              title="Toggle Time Travel"
              className={'tool-button time-travel-button' + (active.timeTravel ? ' on' : '')}
              onClick={e => this.toggleActive('timeTravel')}
            />
            <FontAwesome
              key="unit-test"
              name="check-circle-o"
              title="Toggle Unit Test"
              className={'tool-button unit-test-button' + (active.unitTest ? ' on' : '')}
              onClick={() => this.toggleActive('unitTest')}
            />
            <FontAwesome
              key="save"
              name="file-text-o"
              title="Save Message Log"
              className="tool-button save-msg-button"
              onClick={() => {
                download({ data: JSON.stringify(messages, null, 2), filename: 'message-log.json' });
              }}
            />
            <span
              className="fa-stack tool-button import-msg-button"
              title="Import Message Log"
              onClick={this._import}
            >
              <FontAwesome
                name="file-text-o"
                stack="1x"
              />
              <FontAwesome
                name="arrow-left"
                stack="1x"
              />
            </span>
            {selected.length ? (
              <FontAwesome
                key="replay"
                name="play-circle-o"
                title="Replay Message(s) on Reload"
                className={'tool-button replay-button' + (active.replay ? ' on' : '')}
                onClick={() => {
                  selected.length && this.toggleActive('replay')
                }}
              />
            ) : null}
            <span>
              <FontAwesome
                key="toggle"
                name="fas fa-filter"
                title={active.showFilters ? 'Hide filters' : 'Show filters'}
                className={'tool-button toggle-filter-button' + (active.showFilters ? ' on' : '')}
                onClick={() => this.toggleActive('showFilters')}
              />
              {active.showFilters ? (
                <label htmlFor="show-init" title="Show no-op init messages">
                  <input type="checkbox" onClick={() => this.toggleActive('showInit')} id="show-init" />
                  Show Init
                </label>
              ) : null}
            </span>
          </span>

          <span className="panel-tools-right">
            <span className="button-group">
              <button
                className={'first' + (active.prevState ? ' selected' : '')}
                onClick={() => this.toggleActive('prevState')}
              >
                {'{'}
                <FontAwesome
                  name="arrow-circle-o-left"
                  title="View Previous State"
                />
                {'}'}
              </button>

              <button
                className={active.diffState ? 'selected' : ''}
                onClick={() => this.toggleActive('diffState')}
              >
                {'{'}
                <span style={{ color: 'rgb(100, 150, 150)' }}>+</span>
                |
                <span style={{ color: 'rgb(150, 100, 100)' }}>-</span>
                {'}'}
              </button>

              <button
                className={active.nextState ? 'selected' : ''}
                onClick={() => this.toggleActive('nextState')}
              >
                {'{'}
                <FontAwesome
                  name="arrow-circle-o-right"
                  title="View Next State"
                />
                {'}'}
              </button>

              <button
                className={'last' + (active.dependencyTrace ? '  selected' : '')}
                onClick={() => this.toggleActive('dependencyTrace')}
              >
                <FontAwesome
                  name="search"
                  title="Only show dependencies in Unit Tests and Message view"
                />
              </button>
            </span>
          </span>
        </div>

        <div key="panel" className="panel-container">
          <div key="controls" className="panel left control-deck scrollable">
            <div key="message-list" className="panel-list">
              {(active.showInit ? messages : messages.filter(prop('message'))).map(msg => (
                <div
                  key={msg.id}
                  className={'panel-item' + (contains(msg, selected) ? ' selected' : '')}
                  onClick={e => {
                    const nextSelection = e.shiftKey ? extendSelection(messages, selected, msg) : [msg]
                    const { initial } = this.state;

                    const replayedDeltas = applyDeltas(initial, messagesBeforeSelection(messages, nextSelection));

                    this.setState({
                      replayedDeltas,
                      selected: nextSelection
                    });

                    if (active.timeTravel) {
                      const setState = applyDeltas(replayedDeltas, nextSelection);
                      window.messageClient({ setState });
                    }
                  }}
                >
                  {msg.message !== null ? msg.message : `Init (${msg.name})`}
                </div>
              ))}
            </div>
          </div>

          <div key="panel-head" className="panel content scrollable with-heading">
            <MessageView
              selected={selected}
              initialState={replayedDeltas}
              useDependencyTrace={active.dependencyTrace}
              showUnitTest={active.unitTest}
              showPrevState={active.prevState}
              showDiffState={active.diffState}
              showNextState={active.nextState}
            />
          </div>
        </div>
      </div>
    );
  }

  protected _importDropped = (file: File) => importLog(readFile(file)).then(this._setMsgs);

  /**
   * Use `importLog` to replay a message log from a file on disk, then set
   * `state.messages` to display the Messages contained in the log, and reset
   * selection state.
   */
  protected _import = () => importLog(upload({ type: 'application/json' })).then(this._setMsgs)

  protected _setMsgs = (messages: SerializedMessage[]) => this.setState({
    messages,
    selected: []
  });
}
