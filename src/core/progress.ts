// What a learner can do: per task a counter of right answers in a row (at first try, one per round) and of wrong
// answers. Stars translate it per level and kind of element. Plain JSON, small: it goes to the device's storage.

/** Per task key: [right in a row, wrong in all]. A task without an entry is new. */
export type Progress = { readonly [key: string]: readonly [number, number] };

export type Grade = "new" | "hard" | "practised" | "mastered";

/** Right in a row that make a task mastered: in two different rounds, because a task comes once a round. */
export const MASTERED = 2;

export function grade(progress: Progress, key: string): Grade {
  const entry = progress[key];
  if (entry === undefined) return "new";
  if (entry[0] >= MASTERED) return "mastered";
  return entry[0] >= 1 ? "practised" : "hard";
}

/** The progress after an answer to a task at first try. */
export function record(progress: Progress, key: string, right: boolean): Progress {
  const [rights, wrongs] = progress[key] ?? [0, 0];
  return { ...progress, [key]: right ? [Math.min(rights + 1, MASTERED), wrongs] : [0, wrongs + 1] };
}

/**
 * The stars for a set of tasks: one when a third are practised or mastered, two at two thirds, three when more than
 * 95 % are mastered.
 */
export function stars(progress: Progress, keys: readonly string[]): 0 | 1 | 2 | 3 {
  if (keys.length === 0) return 0;
  let practised = 0;
  let mastered = 0;
  for (const key of keys) {
    const g = grade(progress, key);
    if (g === "mastered") mastered++;
    if (g === "mastered" || g === "practised") practised++;
  }
  if (mastered / keys.length > 0.95) return 3;
  if (practised / keys.length >= 2 / 3) return 2;
  if (practised / keys.length >= 1 / 3) return 1;
  return 0;
}

/** The stars of one round: the share of tasks right at first try, on the same thresholds as `stars`. */
export function roundStars(right: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  const share = right / total;
  if (share > 0.95) return 3;
  if (share >= 2 / 3) return 2;
  if (share >= 1 / 3) return 1;
  return 0;
}

/** A progress from outside (the device's storage): only well-formed entries are kept. */
export function parseProgress(value: unknown): Progress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: { [key: string]: readonly [number, number] } = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      Array.isArray(entry) &&
      entry.length === 2 &&
      Number.isInteger(entry[0]) &&
      Number.isInteger(entry[1]) &&
      entry[0] >= 0 &&
      entry[1] >= 0
    ) {
      result[key] = [Math.min(entry[0], MASTERED), entry[1]];
    }
  }
  return result;
}
