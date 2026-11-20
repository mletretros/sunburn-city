// Each subsystem owns a stream, so adding scenery never changes traffic.
export function hashSeed(seed) {
  let result = 2166136261;
  for (const letter of String(seed)) result = Math.imul(result ^ letter.codePointAt(0), 16777619);
  return result >>> 0;
}
export function makeRng(seed) {
  let state = hashSeed(seed);
  function next() {
    state = state + 0x6d2b79f5 | 0;
    let bits = Math.imul(state ^ state >>> 15, state | 1);
    bits ^= bits + Math.imul(bits ^ bits >>> 7, bits | 61);
    return ((bits ^ bits >>> 14) >>> 0) / 4294967296;
  }
  const range = (min, max) => min + (max - min) * next();
  const int = (min, max) => Math.floor(range(min, max + 1));
  return {
    next, range, int,
    pick: values => values[int(0, values.length - 1)],
    shuffle(values) {
      const copy = values.slice();
      for (let i = copy.length - 1; i > 0; --i) {
        const j = int(0, i), saved = copy[i]; copy[i] = copy[j]; copy[j] = saved;
      }
      return copy;
    },
  };
}
