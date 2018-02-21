import { curry, replace, when, identity, propEq, pipe, keys, map, flip, zipObj, values, both, merge } from 'ramda';
import { isModifiedObject, isModifiedArray, disableEvent, handleDrop } from './util';

import React, { Children } from 'react';
import ObjectName from 'react-inspector/lib/object/ObjectName';
import ObjectValue from 'react-inspector/lib/object/ObjectValue';
import ObjectLabel from 'react-inspector/lib/object-inspector/ObjectLabel';
import ObjectRootLabel from 'react-inspector/lib/object-inspector/ObjectRootLabel';

export const e = curry((el, props, children = []) => React.createElement(el, props, children));
export const div = e('div');
export const span = e('span');
export const button = e('button');

export const nodeRenderer = (obj) => {
  const isRoot = obj.depth === 0;
  const tag = isRoot ? ObjectRootLabel : ObjectLabel;
  const append = isRoot ? {} : { isNonenumerable: obj.isNonenumerable };
  const keyMap = replace(/__(added|deleted)$/, '');
  const name = obj.name && keyMap(obj.name || '') || obj.name;
  const newKeys = when(
    both(identity, propEq('constructor', Object)),
    pipe(keys, map(keyMap), flip(zipObj)(values(obj.data)))
  );

  if (isModifiedObject(obj.data)) {
    return e(diffObjectLabel, merge(append, { name, data: obj.data }));
  }
  if (isModifiedArray(obj.data)) {
    return e(tag, merge(append, { name, data: obj.data.filter(propEq('length', 2)) }));
  }

  return e(tag, merge(append, {
    name,
    data: newKeys(obj.data),
    /* @TODO: Implement */ showPreview: false
  }));
};

export const diffNodeMapper = ({ Arrow, expanded, styles, name, data, onClick, shouldShowArrow, shouldShowPlaceholder, children, renderedNode, childNodes }) => {

  if (isModifiedObject(data)) {
    return div({ className: 'model-diff modified modified-key' }, [
      div({ onClick }, [
        (shouldShowPlaceholder || true) && span({ style: styles.treeNodePlaceholder }, '\u00A0'),
        renderedNode
      ])
    ]);
  }

  let className = '';

  if (name && (/__(added|deleted)$/).test(name)) {
    let match = name.match(/__(added|deleted)$/);
    className = `model-diff ${match[1]} ${match[1]}-key`;
    shouldShowPlaceholder = true;
  }

  return div({}, [
    div({ style: styles.treeNodePreviewContainer, onClick, className }, [
      (shouldShowArrow || Children.count(children) > 0)
        ? e(Arrow, { expanded, styles: styles.treeNodeArrow })
        : shouldShowPlaceholder && span({ style: styles.treeNodePlaceholder }, '\u00A0'),
      renderedNode
    ]),
    e('ol', { role: "group", style: styles.treeNodeChildNodesContainer }, childNodes)
  ]);
};

/**
 * Re-implements ObjectLabel to render a prettier diff for primitive values
 */
export const diffObjectLabel = ({name, data, isNonenumerable}) => {
  return span({}, [
    e(ObjectName, {name, dimmed: isNonenumerable}),
    span({}, ': '),
    e(ObjectValue, { object: data.__old }),
    span({}, ' \u2192 '),
    e(ObjectValue, { object: data.__new })
  ]);
}

export const formatDate = (ts) => {
  const date = new Date(ts);

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(d => `00${d}`.slice(-2))
    .join(':');
};

export const timeSince = (ts) => {
  var now = new Date(),
    timeStamp = new Date(ts),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;

  if (secondsPast < 60) {
    return parseInt(secondsPast) + 's';
  }

  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + 'm';
  }

  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + 'h';
  }

  if (secondsPast > 86400) {
      day = timeStamp.getDate();
      month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ","");
      year = timeStamp.getFullYear() == now.getFullYear() ? "" :  " " + timeStamp.getFullYear();
      return day + " " + month + year;
  }
}
