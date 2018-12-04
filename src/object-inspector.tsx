import * as React from 'react';

import * as copy from 'copy-to-clipboard';
import { is } from 'ramda';
import { ObjectInspector as Inspector, ObjectInspectorProps, ObjectLabel, ObjectNode, ObjectRootLabel, ObjectRootLabelProps, ObjectLabelProps } from 'react-inspector';

import './object-inspector.scss';

const isCopyable = is(Object);

const ObjectInspector: React.SFC<ObjectInspectorProps> = props =>
  <Inspector
    {...props}
    nodeRenderer={NodeRenderer}
  />

const NodeRenderer: React.SFC<ObjectNode<any>> = ({ data, depth, name }) => (
  depth === 0 ?
    <CopyableObjectRootLabel name={name} data={data} /> :
    <CopyableObjectLabel name={name} data={data} isNonenumerable={false} />
);

const CopyableObjectRootLabel: React.SFC<ObjectRootLabelProps> = props => (
  <span>
    <ObjectRootLabel {...props} />
    <CopyButton data={props.data} />
  </span>
);

const CopyableObjectLabel: React.SFC<ObjectLabelProps> = props => {
  const label = <ObjectLabel {...props} />;

  return isCopyable(props.data) ?
    <span>
      {label}
      <CopyButton data={props.data} />
    </span> :
    label
};

const CopyButton: React.StatelessComponent<{ data: any }> = ({ data }) => (
  <button className="copy-node-value" onClick={e => {
    copy(JSON.stringify(data, null, 2));
    e.stopPropagation();
  }}>
    Copy
  </button>
);

export { ObjectInspector, NodeRenderer, CopyableObjectRootLabel, CopyableObjectLabel };
