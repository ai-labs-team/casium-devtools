declare module 'react-inspector' {
  export interface NodeMapperOptions {
    className: string;
  }

  export type NodeRenderer<T> = (obj: ObjectNode<T>) => React.ReactElement;
  export type NodeMapper<T> = (node: ObjectNode<T>, options?: Partial<NodeMapperOptions>) => React.ReactElement;

  export interface ObjectNode<T extends {}> {
    Arrow: React.ReactElement;
    name: string;
    depth: number;
    isNonenumerable: boolean;
    expanded: boolean;
    styles: {
      [key: string]: React.CSSProperties
    };
    onClick: React.MouseEventHandler;
    shouldShowArrow: boolean;
    shouldShowPlaceholder: boolean;
    children: React.ReactChildren;
    renderedNode: React.ReactElement;
    childNodes: React.ReactElement[];
    data: T;
  }

  interface Props {
    data: {};
    expandLevel: number;
    nodeRenderer?: NodeRenderer
    mapper?: NodeMapper
  }

  export var ObjectInspector: React.ComponentClass<Props>;
  export var ObjectRootLabel: React.ComponentClass;
  export var ObjectLabel: React.ComponentClass;

  interface ObjectNameProps {
    name: string;
    dimmed: boolean;
  }

  export var ObjectName: React.ComponentClass<ObjectNameProps>;

  interface ObjectValueProps {
    object?: {};
  }

  export var ObjectValue: React.ComponentClass<ObjectValueProps>;
}
