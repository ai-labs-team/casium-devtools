import * as React from 'react';

import { SerializedMessage } from './instrumenter';

const REFRESH_INTERVAL = 500;

interface Props {
  msg: SerializedMessage;
  relativeTime: boolean;
  onToggle: (relativeTime: boolean) => void;
}

export class MessageHeading extends React.Component<Props> {
  protected _interval?: NodeJS.Timer;

  render() {
    const { name, ts } = this.props.msg;

    return (
      <div className="panel-label time-toggle" onClick={this._onToggle}>
        {`${name} @ ${this._renderTimestamp(ts)}`}
      </div>
    );
  }

  protected _onToggle = () => {
    const { onToggle, relativeTime } = this.props;
    onToggle(!relativeTime);
  }

  protected _renderTimestamp(ts: number) {
    const { relativeTime } = this.props;
    return relativeTime ? timeSince(ts) : formatDate(ts);
  }

  protected _setUpdateInterval() {
    this._interval = setInterval(() => this.forceUpdate(), REFRESH_INTERVAL);
  }

  protected _clearUpdateInterval() {
    this._interval && clearInterval(this._interval);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.relativeTime === true && this.props.relativeTime === false) {
      this._setUpdateInterval();
    }

    if (nextProps.relativeTime === false && this.props.relativeTime === true) {
      this._clearUpdateInterval();
    }
  }

  componentDidMount() {
    if (this.props.relativeTime === true) {
      this._setUpdateInterval();
    }
  }

  componentWillUnmount() {
    this._clearUpdateInterval();
  }
}

export const timeSince = (ts: number) => {
  const now = new Date(),
    timeStamp = new Date(ts),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;

  if (secondsPast < 60) {
    return Math.floor(secondsPast) + 's';
  }

  if (secondsPast < 3600) {
    return Math.floor(secondsPast / 60) + 'm';
  }

  if (secondsPast <= 86400) {
    return Math.floor(secondsPast / 3600) + 'h';
  }

  if (secondsPast > 86400) {
    const day = timeStamp.getDate();
    const month = (timeStamp.toDateString().match(/ [a-zA-Z]*/) as string[])[0].replace(" ", "");
    const year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
    return day + " " + month + year;
  }
}

export const formatDate = (ts: number) => {
  const date = new Date(ts);

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(d => `00${d}`.slice(-2))
    .join(':');
}
