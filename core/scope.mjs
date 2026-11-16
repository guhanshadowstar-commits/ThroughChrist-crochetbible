// Search scopes: the whole Bible, one testament, or one book, as a [lo, hi] range of verse refs.
const OT_END = 39 * 1e6 + 999999;

/** @param {string} scope 'all' | 'ot' | 'nt' | 'b<bookId>'  @returns {[number, number] | null} */
export function scopeRange(scope) {
  if (!scope || scope === 'all') return null;
  if (scope === 'ot') return [1e6, OT_END];
  if (scope === 'nt') return [40e6, 66e6 + 999999];
  const m = /^b(\d+)$/.exec(scope);
  if (m && +m[1] >= 1 && +m[1] <= 66) return [+m[1] * 1e6, +m[1] * 1e6 + 999999];
  return null;
}
