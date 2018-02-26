import * as React from 'react';
import * as copy from 'copy-to-clipboard';
import { both, flip, identity, keys, map, merge, pipe, propEq, replace, values, when, zipObj } from 'ramda';
import { NodeRenderer, NodeMapper, ObjectRootLabel, ObjectLabel } from 'react-inspector';

import { isModifiedObject, isModifiedArray, typeOf } from './util';

import './object-inspector.scss';

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
    return <Label {...append({ name, data: obj.data })} />
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

export const diffNodeMapper: NodeMapper<ObjectDiffNode> = node => {
  let { data, childNodes, name, shouldShowPlaceholder } = node;

  if (isModifiedObject(data)) {
    const [oldNode, newNode] = childNodes;

    return (
      <div>
        <div className="model-diff deleted deleted-key">
          {React.cloneElement(oldNode, { name })}
        </div>
        <div className="model-diff added added-key">
          {React.cloneElement(newNode, { name })}
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

  return nodeMapper(merge(node, { shouldShowPlaceholder }), { className });
}

const CopyButton: React.StatelessComponent<{ data: any }> = ({ data }) => (
  <button className="copy-node-value" onClick={e => {
    copy(JSON.stringify(data, null, 2));
    e.stopPropagation();
  }}>
    Copy
  </button>
);

export const nodeMapper: NodeMapper<any> = ({ shouldShowArrow, children, expanded, styles, shouldShowPlaceholder, Arrow, onClick, renderedNode, childNodes, data }, options = { className: '' }) => {
  const placeholder = (shouldShowArrow || React.Children.count(children) > 0) ?
    <Arrow expanded={expanded} styles={styles.treeNodeArrow} /> :
    shouldShowPlaceholder ?
      <span style={styles.treeNodePlaceholder}>{PLACEHOLDER}</span> :
      null;

  const type = typeOf(data);

  return (
    <div className="mapped-node">
      <div
        style={styles.treeNodePreviewContainer}
        onClick={onClick}
        className={`mapped-node-preview-container ${options.className}`}
      >
        {placeholder}
        {renderedNode}
        {type === 'object' || type === 'array' ? <CopyButton data={data} /> : null}
      </div>
      <ol role="group" style={styles.treeNodeChildNodesContainer}>
        {childNodes}
      </ol>
    </div>
  );
}
