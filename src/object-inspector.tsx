import React from 'react';
import { both, flip, identity, keys, map, merge, pipe, propEq, replace, values, when, zipObj } from 'ramda';
import { NodeRenderer, NodeMapper, ObjectRootLabel, ObjectLabel } from 'react-inspector';

import { isModifiedObject, isModifiedArray } from './util';

interface ObjectDiffNode {
  __new?: {};
  __old?: {};
}

type ArrayDiffNode = any[][];

const PLACEHOLDER = '\u00A0';

export const nodeRenderer: NodeRenderer<ObjectDiffNode> = obj => {
  const isRoot = obj.depth === 0;
  const Label = isRoot ? ObjectRootLabel : ObjectLabel;
  const append = merge(isRoot ? {} : { isNonenumerable: obj.isNonenumerable });
  const keyMap = replace(/__(added|deleted)$/, '');
  const name = obj.name && keyMap(obj.name || '') || obj.name;
  const newKeys = when(
    both(identity, propEq('constructor', Object)),
    pipe(keys, map(keyMap), flip(zipObj)(values(obj.data)))
  );

  if (isModifiedObject(obj.data)) {
    return <Label {...append({ name, data: obj.data.__new }) } />
  }

  if (isModifiedArray(obj.data)) {
    const props = append({
      name,
      data: (obj.data as ArrayDiffNode).filter(propEq('length', 2))
    });

    return <Label {...props} />;
  }

  const props = append({
    name,
    data: newKeys(obj.data),
    /* @TODO: Implement */ showPreview: false
  });

  return <Label {...props} />;
}

export const diffNodeMapper: NodeMapper<ObjectDiffNode> = ({ Arrow, expanded, styles, name, data, onClick, shouldShowArrow, shouldShowPlaceholder, children, renderedNode, childNodes }) => {
  if (isModifiedObject(data)) {
    const placeholder = shouldShowPlaceholder || true ? (
      <span style={styles.treeNodePlacholder}>
        {PLACEHOLDER}
      </span>
    ) : null;

    return (
      <div className="model-diff modified modified-key">
        <div onClick={onClick}>
          {placeholder}
          {renderedNode}
        </div>
      </div>
    );
  }

  let className = '';

  if (name && (/__(added|deleted)$/).test(name)) {
    const match = name.match(/__(added|deleted)$/) as string[];
    className = `model-diff ${match[1]} ${match[1]}-key`;
    shouldShowPlaceholder = true;
  }

  const placeholder = (shouldShowArrow || React.Children.count(children) > 0) ?
    <Arrow expanded={expanded} styles={styles.treeNodeArrow} /> :
    shouldShowPlaceholder ?
      <span style={styles.treeNodePlaceholder}>{PLACEHOLDER}</span> :
      null;

  return (
    <div>
      <div
        style={styles.treeNodePreviewContainer}
        onClick={onClick}
        className={className}
      >
        {placeholder}
        {renderedNode}
      </div>
      <ol role="group" style={styles.treeNodeChildNodesContainer}>
        {childNodes}
      </ol>
    </div>
  );
}
