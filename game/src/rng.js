// A string mixer feeds xorshift32; each subsystem owns its own stream.
export function hashSeed(seed) {
  const label = String(seed);
  let word = 0x9e3779b9;
  for (let at = 0; at < label.length; at++) {
    word = Math.imul(word + label.charCodeAt(at), 0x85ebca6b);
    word = (word << 13) | (word >>> 19);
  }
  return (word ^ (word >>> 16)) >>> 0;
}
export function makeRng(seed) {
  let word = hashSeed(seed) || 0x12345678;
  const stream = {
    next() {
      word ^= word << 13;
      word ^= word >>> 17;
      word ^= word << 5;
      return (word >>> 0) * 2.3283064365386963e-10;
    },
    range(a, b) { return a + (b - a) * stream.next(); },
    int(a, b) { return a + Math.floor(stream.next() * (b - a + 1)); },
    pick(items) { return items[Math.floor(stream.next() * items.length)]; },
    shuffle(items) {
      const deck = items.slice();
      for (let n = deck.length; n > 1; n--) {
        const chosen = stream.int(0, n - 1), hold = deck[n - 1];
        deck[n - 1] = deck[chosen]; deck[chosen] = hold;
      }
      return deck;
    },
  };
  return stream;
}
