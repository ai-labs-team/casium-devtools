import { is, both, and, map, reduce, pipe, merge, curry, F, flip, contains, equals } from 'ramda';

const inList = flip(contains)

export const typeOf = (val) => (
  ((val === null || val === undefined) && 'null') ||
  (typeof val === 'object' && val.constructor === Array && 'array') ||
  typeof val
);

export const isModifiedObject = both(is(Object), diff => ('__old' in diff) && ('__new' in diff) && (Object.keys(diff).length === 2));

export const isModifiedArray = both(
  pipe(typeOf, equals('array')),
  pipe(
    map(val => (typeOf(val) === 'array' && (
      val.length === 2 && ['-', '+', '~'].includes(val[0]) ||
      val.length === 1 && val[0] === ' '
    ))),
    reduce(and, true)
  )
);

export const isDiffVal = item => !((typeOf(item) !== 'array') || !((item.length === 2) || ((item.length === 1) && (item[0] === ' '))) || !(typeof(item[0]) === 'string') || item[0].length != 1 || !([' ', '-', '+', '~'].includes(item[0])))

export const toPath = (obj) => {
  if (!obj instanceof Object) return [];
  if (isModifiedObject(obj)) return [];
  return flatten(Object.keys(obj).map(key => [key].concat(toPath(obj[key]))))
};

export const download = (options = {}) => {
  const opts = merge({
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

export function isolate(e) {
  if (e.preventDefault) e.preventDefault();
  if (e.stopPropagation) e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  if (e.srcEvent) isolate(e.srcEvent);
  return e;
}

export const disableEvent = pipe(isolate, F);

export const handleDrop = curry((handler, event) => {
  Array.from(event.dataTransfer.files).forEach((file) => handler({ event, file }));
  return event;
});
