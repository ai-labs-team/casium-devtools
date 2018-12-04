import * as React from 'react';

import { GenericObject } from 'casium/core';
import { unnest, identity, pluck } from 'ramda';
import { DeltaInspector } from '@fountainhead/react-json-delta-inspector';

import { SerializedMessage, SerializedCommand } from './instrumenter';
import { DependencyTrace, runDependencyTrace } from './dependency-trace';
import { applyDeltas, deepPick } from './util';
import { generateUnitTest } from './test-generator';
import { MessageHeading } from './MessageHeading';
import { ObjectInspector } from './object-inspector';

import './MessageView.scss';
import { Diff } from '@warrenseymour/json-delta';

interface Props {
  initialState: GenericObject;
  selected: SerializedMessage[];
  showUnitTest?: boolean;
  showPrevState?: boolean;
  showDiffState?: boolean;
  showNextState?: boolean;
  useDependencyTrace?: boolean;
}

interface State {
  finalState: GenericObject;
  unitTest?: string;
  dependencyTraces: DependencyTrace[];
  relativeTime: boolean;
}

export class MessageView extends React.Component<Props, State> {
  state: State = {
    unitTest: undefined,
    dependencyTraces: [],
    relativeTime: true,
    finalState: {}
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

  componentDidMount() {
    this._updateDependencyTraces(this.props.useDependencyTrace, this.props.initialState, this.props.selected);
    this._updateNext(this.props.initialState, this.props.selected);
  }

  componentWillReceiveProps(nextProps: Props) {
    const shouldUpdateNext = nextProps.selected !== this.props.selected;
    if (shouldUpdateNext) {
      this._updateNext(nextProps.initialState, nextProps.selected);
    }

    const shouldUpdateDependencyTraces = (
      (nextProps.useDependencyTrace !== this.props.useDependencyTrace) ||
      (nextProps.selected !== this.props.selected)
    );

    const traces = shouldUpdateDependencyTraces ?
      this._updateDependencyTraces(nextProps.useDependencyTrace, nextProps.initialState, nextProps.selected) :
      Promise.resolve(this.state.dependencyTraces);

    const shouldUpdateUnitTest = (
      (nextProps.showUnitTest === true && this.props.showUnitTest === false) ||
      shouldUpdateDependencyTraces
    );

    if (shouldUpdateUnitTest) {
      traces.then(traces => this._updateUnitTest(nextProps.initialState, nextProps.selected, traces));
    }
  }

  protected _renderUnitTest() {
    const { showUnitTest } = this.props;
    const { unitTest } = this.state;

    return (
      <div className={'unit-test-content' + (showUnitTest ? ' on' : '')} key='unit-test'>
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
      const data = (useDependencyTrace && dependencyTrace) ? deepPick(msg.data || {}, dependencyTrace.message) : msg.data || {};

      const relayItem = Object.keys(relay).length > 0 ? [
        <div className="panel-label" key="relay">Relay</div>,
        <ObjectInspector data={relay} expandLevel={0} key="relay-inspector" />
      ] : null;

      return (
        <div className="message" key={msg.id}>
          <MessageHeading msg={msg} relativeTime={relativeTime} onToggle={this._toggleRelativeTime} />
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
    const commands = unnest<SerializedCommand>((pluck as any)('commands', this.props.selected))
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

    const { initialState } = this.props;

    return (
      <div className="previous-state">
        <div className="panel-heading panel-label">Previous Model</div>
        <ObjectInspector data={initialState} expandLevel={2} />
      </div>
    );
  }

  protected _renderDiffState() {
    if (!this.props.showDiffState) {
      return;
    }

    const { selected, initialState } = this.props;
    const delta = selected.reduce((combinedDelta: Diff, { delta }) => delta ? combinedDelta.concat(delta) : combinedDelta, []);

    const item = delta.length ?
      <DeltaInspector prev={initialState} delta={delta} /> :
      <em style={{ color: 'lightgray' }}>No Changes</em>;

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

    const { finalState } = this.state;

    return (
      <div className="next-state">
        <div className="panel-heading panel-label">New Model</div>
        <ObjectInspector data={finalState} expandLevel={2} />
      </div>
    );
  }

  protected _updateDependencyTraces(enabled: boolean | undefined, initial: GenericObject, selected: SerializedMessage[]) {
    const traces = enabled ?
      // @todo: This is naive - should compute `initial` for each message using
      // the previous delta rather than re-using the same initial for each
      // iteration.
      Promise.all(selected.map(msg => runDependencyTrace(initial, msg))) :
      Promise.resolve([]);

    return traces
      .then(dependencyTraces => {
        this.setState({ dependencyTraces });
        return dependencyTraces;
      })
      .catch(err => {
        console.error('Failed to load dependency trace for selected messages', err);
        return [];
      });
  }

  protected _updateUnitTest(initialState: GenericObject, messages: SerializedMessage[], traces: DependencyTrace[]) {
    this.setState(({ finalState }) => ({
      unitTest: generateUnitTest(messages, initialState, finalState, traces)
    }));
  }

  protected _updateNext(initial: GenericObject, messages: SerializedMessage[]) {
    this.setState({
      finalState: applyDeltas(initial, messages)
    });
  }

  protected _toggleRelativeTime = (relativeTime: boolean) => {
    this.setState({ relativeTime });
  }
}
