// Randomness from a seed only: a small generator (mulberry32) whose state is a plain number, so that the state of the
// app stays JSON and the same seed, route and inputs give the same rounds.

/** The next number in [0, 1) and the generator's next state. */
export function draw(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** The items in a random order (Fisher-Yates) and the generator's next state. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const result = [...items];
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [value, next] = draw(rng);
    rng = next;
    const j = Math.floor(value * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return [result, rng];
}
