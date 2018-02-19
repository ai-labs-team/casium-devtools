declare module 'react-inspector' {
  export type NodeRenderer<T> = (obj: ObjectNode<T>) => React.ReactNode;
  export type NodeMapper<T> = (node: ObjectNode<T>) => React.ReactNode;

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
}
