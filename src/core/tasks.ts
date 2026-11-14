// The tasks and the rounds. A task is one thing to do with one element: its key (kind and element id) is what the
// progress is kept under. A round has ten tasks, mostly new and hard ones, some repetition.
import { ELEMENTS, elementById, type Element } from "./data.ts";
import { distanceKm } from "./geo.ts";
import { grade, type Progress } from "./progress.ts";
import { draw, shuffle } from "./random.ts";

/** The kinds of tasks: erkennen is a marked element and four names (Stufe 1). */
export type TaskKind = "erkennen";

/** Whether the feedback of a kind of task shows the distance between answer and right place: only where learners point. */
export const SHOWS_DISTANCE: Readonly<Record<TaskKind, boolean>> = { erkennen: false };

export interface Task {
  /** `<kind>:<element id>`, the key of the progress. */
  readonly key: string;
  readonly kind: TaskKind;
  readonly target: string;
  /** The ids of the options, in the order shown; the target is one of them. */
  readonly options: readonly string[];
}

/** Tasks in a round. */
export const ROUND_SIZE = 10;
const OPTIONS = 4;
/** In a round: at most this many hard ones, then new ones, practised ones and mastered ones to repeat. */
const SLOTS = { hard: 4, new: 4, practised: 2, mastered: 2 } as const;

/** The kinds of tasks a level has. */
function taskKinds(level: number): readonly TaskKind[] {
  return level === 1 ? ["erkennen"] : [];
}

export function taskKey(kind: TaskKind, target: string): string {
  return `${kind}:${target}`;
}

/** Whether an element has tasks on a level and in the topics chosen. */
function inScope(element: Element, level: number, topics: readonly string[]): boolean {
  return element.level <= level && topics.includes(element.kind);
}

/** The keys of all tasks of a level and a set of topics: the whole of what there is to learn there. */
export function taskKeys(level: number, topics: readonly string[]): string[] {
  return taskKinds(level).flatMap((kind) =>
    ELEMENTS.filter((element) => inScope(element, level, topics)).map((element) => taskKey(kind, element.id)),
  );
}

/** Three wrong options for a target: elements of the same kind, from the six nearest. */
function wrongOptions(target: Element, level: number, rng: number): [string[], number] {
  const near = ELEMENTS.filter((e) => e.kind === target.kind && e.id !== target.id && e.level <= level)
    .map((e) => ({ id: e.id, km: distanceKm(e.centre, target.centre) }))
    .sort((a, b) => a.km - b.km || a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((e) => e.id);
  const [mixed, next] = shuffle(near, rng);
  return [mixed.slice(0, OPTIONS - 1), next];
}

/** One task for a key: the options are drawn from the generator. */
function makeTask(key: string, level: number, rng: number): [Task, number] {
  const [kind, target] = key.split(":") as [TaskKind, string];
  const [wrong, afterWrong] = wrongOptions(elementById(target), level, rng);
  const [options, next] = shuffle([target, ...wrong], afterWrong);
  return [{ key, kind, target, options }, next];
}

/** The next round: hard ones first, new ones, then some repetition; filled up from the other groups. */
export function buildRound(
  progress: Progress,
  level: number,
  topics: readonly string[],
  seed: number,
): [Task[], number] {
  const keys = taskKeys(level, topics);
  const groups = { hard: [] as string[], new: [] as string[], practised: [] as string[], mastered: [] as string[] };
  let rng = seed;
  const [ordered, afterOrder] = shuffle(keys, rng);
  rng = afterOrder;
  for (const key of ordered) groups[grade(progress, key)].push(key);
  const chosen: string[] = [];
  for (const name of ["hard", "new", "practised", "mastered"] as const) {
    chosen.push(...groups[name].splice(0, SLOTS[name]));
  }
  for (const name of ["hard", "new", "practised", "mastered"] as const) {
    while (chosen.length < ROUND_SIZE && groups[name].length > 0) chosen.push(groups[name].shift() as string);
  }
  const [mixed, afterMix] = shuffle(chosen.slice(0, ROUND_SIZE), rng);
  rng = afterMix;
  const tasks: Task[] = [];
  for (const key of mixed) {
    const [task, next] = makeTask(key, level, rng);
    tasks.push(task);
    rng = next;
  }
  return [tasks, draw(rng)[1]];
}
