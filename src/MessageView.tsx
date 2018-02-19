import React from 'react';
import { ObjectInspector } from 'react-inspector';
import { unnest, identity, last, pluck } from 'ramda';
import { diff } from 'json-diff';

import { SerializedMessage, Command } from './messaging';
import { DependencyTrace, runDependencyTrace } from './dependency-trace';
import { nextState, deepPick } from './util';
import { nodeRenderer, diffNodeMapper } from './object-inspector';
import { generateUnitTest } from './test-generator';
import { MessageHeading } from './MessageHeading';

import './MessageView.scss';

interface Props {
  selected: SerializedMessage[];
  showUnitTest: boolean;
  showPrevState: boolean;
  showDiffState: boolean;
  showNextState: boolean;
  useDependencyTrace: boolean;
}

interface State {
  unitTest?: string;
  dependencyTraces: DependencyTrace[];
  relativeTime: boolean;
}

export class MessageView extends React.Component<Props, State> {
  state: State = {
    unitTest: undefined,
    dependencyTraces: [],
    relativeTime: true
  }

  render() {
    return this.props.selected.length ? (
      <div className="message-view">
        {this._renderUnitTest()}
        {this._renderMessages()}
        {this._renderCommands()}
        {this._renderPrevState()}
        {this._renderDiffState()}
        {this._renderNextState()}
      </div>
    ) : null;
  }

  componentWillReceiveProps(nextProps: Props) {
    const shouldUpdateDependencyTraces = (
      (nextProps.useDependencyTrace !== this.props.useDependencyTrace) ||
      (nextProps.selected !== this.props.selected)
    );

    const traces = shouldUpdateDependencyTraces ?
      this._updateDependencyTraces(nextProps.useDependencyTrace, nextProps.selected) :
      Promise.resolve(this.state.dependencyTraces);

    const shouldUpdateUnitTest = (
      (nextProps.showUnitTest === true && this.props.showUnitTest === false) ||
      shouldUpdateDependencyTraces
    );

    if (shouldUpdateUnitTest) {
      traces.then(traces => this._updateUnitTest(nextProps.selected, traces));
    }
  }

  protected _renderUnitTest() {
    const { showUnitTest } = this.props;
    const { unitTest } = this.state;

    return (
      <div className={'unit-test-content' + (showUnitTest ? ' on' : '')}>
        {unitTest || 'Generating Unit Test...'}
      </div>
    );
  }

  protected _renderMessages() {
    const { selected, useDependencyTrace } = this.props;
    const { relativeTime, dependencyTraces } = this.state;

    const items = selected.map((msg, index) => {
      const dependencyTrace = dependencyTraces[index];
      const relay = (useDependencyTrace && dependencyTrace) ? deepPick(msg.relay, dependencyTrace.relay) : msg.relay;
      const data = (useDependencyTrace && dependencyTrace) ? deepPick(msg.data, dependencyTrace.message) : msg.data;

      const relayItem = Object.keys(relay).length > 0 ? [
        <div className="panel-label">Relay</div>,
        <ObjectInspector data={relay} expandLevel={0} />
      ] : null;

      return (
        <div className="message" key={msg.id}>
          <MessageHeading
            msg={msg}
            relativeTime={relativeTime}
            onToggle={this._toggleRelativeTime}
          />
          <div className="message-properties">
            <div className="panel-label">Data</div>
            <ObjectInspector data={data} expandLevel={0} />
            {relayItem}
          </div>
        </div>
      )
    });

    return (
      <div className="messages">
        <div className="panel-heading panel-label">Messages</div>
        {items}
      </div>
    );
  }

  protected _renderCommands() {
    const commands = unnest<Command>((pluck as any)('commands', this.props.selected))
      .filter(identity);

    if (!commands.length) {
      return;
    }

    const items = commands.map((command, index) => (
      <div className="command" key={index}>
        <div className="panel-label">{command[0]}</div>
        <ObjectInspector data={command[1]} expandLevel={1} />
      </div>
    ));

    return (
      <div className="commands">
        <div className="panel-heading panel-label">Commands</div>
        {items}
      </div>
    );
  }

  protected _renderPrevState() {
    if (!this.props.showPrevState) {
      return;
    }

    const { prev } = this.props.selected[0];

    return (
      <div className="previous-state">
        <div className="panel-heading panel-label">Previous Model</div>
        <ObjectInspector data={prev} expandLevel={2} />
      </div>
    );
  }

  protected _renderDiffState() {
    if (!this.props.showDiffState) {
      return;
    }

    const { selected } = this.props;
    const { prev } = selected[0];
    const next = nextState(last(selected) as SerializedMessage);

    const diffMap = diff(prev, next);

    const item = diffMap === undefined ? <em style={{ color: 'lightgray' }}>No Changes</em> : (
      <ObjectInspector
        data={diffMap}
        expandLevel={3}
        nodeRenderer={nodeRenderer}
        mapper={diffNodeMapper}
      />
    );

    return (
      <div className="diff-state">
        <div className="panel-heading panel-label">Model Changes</div>
        {item}
      </div>
    );
  }

  protected _renderNextState() {
    if (!this.props.showNextState) {
      return;
    }

    const next = nextState(last(this.props.selected) as SerializedMessage);

    return (
      <div className="next-state">
        <div className="panel-heading panel-label">New Model</div>
        <ObjectInspector data={next} expandLevel={2} />
      </div>
    );
  }

  protected _updateDependencyTraces(enabled: boolean, selected: SerializedMessage[]) {
    const traces = enabled ?
      Promise.all(selected.map(runDependencyTrace)) :
      Promise.resolve([]);

    return traces
      .then(dependencyTraces => {
        this.setState({ dependencyTraces });

        return dependencyTraces;
      });
  }

  protected _updateUnitTest(messages: SerializedMessage[], traces: DependencyTrace[]) {
    this.setState({
      unitTest: generateUnitTest(messages, traces)
    });
  }

  protected _toggleRelativeTime = (relativeTime: boolean) => {
    this.setState({ relativeTime });
  }
}
