export type Span =
  | { r: number } // retain
  | { d: number } // delete
  | { i: string }; // insert

export type PatchWithBaseVersion = {
  v: string; // base version, スナップショットの値
  s: Span[]; // span
};

export type PatchWithoutBaseVersion = {
  s: Span[]; // span
};

export type Patch = PatchWithBaseVersion | PatchWithoutBaseVersion;

export const $Patch = {
  create(patch: Patch): Readonly<Patch> {
    return Object.freeze(patch);
  },
  hasBaseVersion(patch: Patch): patch is PatchWithBaseVersion {
    return 'v' in patch;
  },
};
