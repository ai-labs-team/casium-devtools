import { applyDiff } from '@warrenseymour/json-delta';
import { and, both, contains, equals, flip, has, is, lensPath, map, merge, nth, pipe, reduce, set, tail, view, where } from 'ramda';

import { SerializedMessage } from './instrumenter';
import { GenericObject } from 'casium/core';

const inList = flip(contains);

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
    blob = new Blob([opts.data as any], { type: opts.type });

  link.href = window.URL.createObjectURL(blob);
  link.download = opts.filename;
  evt.initEvent('click', true, true);
  link.dispatchEvent(evt);
};

export interface UploadOptions {
  type: string;
}

export interface UploadResult {
  filename: string;
  content: string;
}

export const readFile = (file: File): Promise<UploadResult> => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = (e: any) => resolve({
    filename: file.name,
    content: e.target.result
  });
  reader.onerror = reject;
  file && reader.readAsText(file);
  !file && reject(new Error('File is empty'));
});

/**
 * Prompts the user to select a file, and returns a `FileList` wrapped in a promise.
 */
const requestFile = (options: Partial<UploadOptions> = {}): Promise<FileList> => new Promise((resolve, reject) => {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');

  if (options.type) {
    input.setAttribute('accept', options.type);
  }
  input.addEventListener('change', () => (!input.files || !input.files[0]) ? reject() : resolve(input.files));

  const evt = document.createEvent('MouseEvents');
  evt.initEvent('click', true, true);

  input.dispatchEvent(evt);
});

/**
 * Prompt the user to select a file, then read it.
 */
export const upload = (options: Partial<UploadOptions> = {}): Promise<UploadResult> => (
  requestFile(options).then(nth(0) as any as (fl: FileList) => File).then(readFile)
);

/**
 * Applies a single message's delta to an initial state, yielding the state
 * after that message occurred.
 */
export const applyDelta = (initialState: GenericObject, { delta }: SerializedMessage) =>
  applyDiff(initialState, delta);

/**
 * Applies multiple messages' deltas to an initial state, yielding the final
 * state after all messages occurred.
 */
export const applyDeltas = (initial: GenericObject, messages: SerializedMessage[]) =>
  messages.reduce(applyDelta as any, initial);

export const nextState = (path: string[], next: GenericObject, prev: GenericObject | null) =>
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
      return typeOf(val) === 'array' && (
        val.length === 2 && ['-', '+', '~'].includes(val[0]) ||
        val.length === 1 && val[0] === ' '
      );
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
      if (!hasPath(path, data || {})) {
        return result;
      }

      const lens = lensPath(path);
      const value = view(lens, data);

      return set(lens, value, result);
    }, {});

export const fromMatches = (senders: string[]) => where({ from: inList(senders) });
