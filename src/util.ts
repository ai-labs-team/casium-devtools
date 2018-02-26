import { and, both, equals, has, is, lensPath, map, merge, pipe, reduce, set, tail, view } from 'ramda';

import { SerializedMessage } from './messaging';

export interface DownloadOptions {
  filename: string;
  type: string;
  data?: {};
}

export const download = (options: Partial<DownloadOptions> = {}) => {
  const opts: DownloadOptions = merge({
    filename: 'file-' + Math.random().toString(36).substr(2, 5),
    type: 'application/octet-stream'
  }, options);

  if (opts.data === null || opts.data === undefined) {
    return false;
  }

  const link = document.createElement('a'),
    evt = document.createEvent("MouseEvents"),
    blob = new Blob([opts.data], { type: opts.type });

  link.href = window.URL.createObjectURL(blob);
  link.download = opts.filename;
  evt.initEvent('click', true, true);
  link.dispatchEvent(evt);
};

export const nextState = ({ path, prev, next }: SerializedMessage) =>
  set(lensPath(path), next, prev);

export const isModifiedObject = both(
  is(Object),
  diff => ('__old' in diff) && ('__new' in diff) && (Object.keys(diff).length === 2)
);

export const typeOf = (val: any) => (
  ((val === null || val === undefined) && 'null') ||
  (typeof val === 'object' && val.constructor === Array && 'array') ||
  typeof val
);

export const isModifiedArray = both(
  pipe(typeOf, equals('array')),
  pipe(
    map((val: any[]) => {
      return (typeOf(val) === 'array' && (
        val.length === 2 && ['-', '+', '~', ' '].includes(val[0])
      ));
    }),
    reduce<boolean, boolean>(and, true)
  )
);

export const hasPath = (path: string[], data: any): boolean => {
  const key = path[0];

  if (!has(key, data)) {
    return false;
  }

  const value = data[key];
  if (is(Object, value)) {
    return path.length === 1 || hasPath(tail(path), value);
  }

  return true;
}

export const deepPick = <T extends {}>(data: T, paths: string[][]): Partial<T> =>
  paths
    .sort((a, b) => a.length - b.length)
    .reduce((result, path) => {
      if (!hasPath(path, data)) {
        return result;
      }

      const lens = lensPath(path);
      const value = view(lens, data);

      return set(lens, value, result);
    }, {});

