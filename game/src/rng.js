export function hashSeed(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return hash >>> 0;
}

export function makeRng(seed) {
  let state = hashSeed(seed);
  const next = () => {
    let n = state = (state + 0x6d2b79f5) >>> 0;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
  const range = (min, max) => min + (max - min) * next();
  return {
    next, range, int: (min, max) => Math.floor(range(min, max + 1)),
    pick: items => items[Math.floor(next() * items.length)],
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}
