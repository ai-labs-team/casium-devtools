import * as React from 'react';
import * as FontAwesome from 'react-fontawesome';

import './Notifier.scss';

// Amount of time that a message should appear before being dismissed
// automatically
const MESSAGE_DISPLAY_TIMEOUT = 5000;

interface Notice {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  code?: string;
}

interface Props { }

interface State {
  notice?: Notice;
}

export class Notifier extends React.Component<Props, State> {
  protected _timeout?: any;

  state: State = {
    notice: undefined
  }

  render() {
    const { notice } = this.state;

    if (!notice) {
      return null;
    }

    return (
      <div className="notifier">
        <div className={`notifier__notice notifier__notice--${notice.type}`}>
          <FontAwesome
            className="notifier__notice__close"
            name="close"
            onClick={this._onClose}
          />
          <p className="notifier__notice__title">{notice.title}</p>
          <p className="notifier__notice__message">{notice.message}</p>
          {notice.code && <pre className="notifier__notice__code">{notice.code}</pre>}
        </div>
      </div>
    )
  }

  componentDidMount() {
    instance = this;
  }

  componentWillUnmount() {
    instance = undefined;
    this._timeout && clearTimeout(this._timeout);
  }

  public add(notice: Notice) {
    this.setState({ notice });

    this._timeout = setTimeout(() => {
      instance && this._onClose();
    }, MESSAGE_DISPLAY_TIMEOUT);
  }

  protected _onClose = () => {
    this.setState({ notice: undefined });
  }
}

let instance: Notifier | undefined;

export const display = (notice: Notice) => {
  if (!instance) {
    throw Error('Tried to display a notice when Notifier instance is not mounted');
  }

  instance.add(notice);
}
