import * as hjson from 'hjson';

// @types/hjson is incomplete; `condense` option is missing
declare module 'hjson' {
  interface SerializeOptions extends hjson.SerializeOptions {
    condense: number;
  }
}

