import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from './App';
import { Notifier } from './Notifier';

render(createElement(App), document.getElementById('app'));
render(createElement(Notifier), document.getElementById('notifier'));
