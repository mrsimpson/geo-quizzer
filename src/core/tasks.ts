// The tasks and the rounds. A task is one thing to do: its key is what the progress is kept under. A round has ten
// tasks, mostly new and hard ones, some repetition.
//
// Stufe 1, erkennen: an element is marked, four names. Stufe 2, beziehung: a question from a relation between two
// elements (capital of, flows through, lies in, belongs to, borders), four answers.
import { ELEMENTS, RELATIONS, elementById, type Element, type Kind } from "./data.ts";
import { distanceKm } from "./geo.ts";
import { grade, type Progress } from "./progress.ts";
import { draw, shuffle } from "./random.ts";

/** The kinds of tasks. */
export type TaskKind = "erkennen" | "beziehung" | "zeigen" | "setzen" | "tippen";

/** Whether the feedback of a kind of task shows the distance between answer and right place: only where learners point. */
export const SHOWS_DISTANCE: Readonly<Record<TaskKind, boolean>> = {
  erkennen: false,
  beziehung: false,
  zeigen: true,
  setzen: true,
  tippen: false,
};

export interface Task {
  /** The key of the progress. */
  readonly key: string;
  readonly kind: TaskKind;
  /** What is marked on the map and asked about: the element itself (erkennen) or the one the question names. */
  readonly subject: string;
  /** The right answer, an element id. */
  readonly target: string;
  /** The type of the relation (beziehung only). */
  readonly relation?: string;
  /** "f" when the subject is the `from` of the relation, "r" when it is the `to` (beziehung only). */
  readonly dir?: "f" | "r";
  /** The ids of the options, in the order shown; the target is one of them. */
  readonly options: readonly string[];
}

/** Tasks in a round. */
export const ROUND_SIZE = 10;
const OPTIONS = 4;
/** In a round: at most this many hard ones, then new ones, practised ones and mastered ones to repeat. */
const SLOTS = { hard: 4, new: 4, practised: 2, mastered: 2 } as const;

interface RelationTask {
  readonly key: string;
  readonly type: string;
  readonly subject: string;
  readonly answer: string;
  readonly dir: "f" | "r";
  /** The topic the task belongs to: the kind of the element that owns the relation. */
  readonly topic: Kind;
}

/** The topic of a relation: hauptstadt-von belongs to the capitals, fliesst-durch to the rivers, ... */
function topicOf(type: string, from: Element): Kind {
  if (type === "hauptstadt-von") return "stadt";
  if (type === "fliesst-durch") return "fluss";
  if (type === "gehoert-zu") return "raum";
  if (type === "grenzt-an") return "land";
  return from.kind;
}

/** All tasks of the relations on a level: each relation in both directions. */
function relationTasks(level: number): RelationTask[] {
  const tasks: RelationTask[] = [];
  for (const r of RELATIONS) {
    // "-auch" relations only say what is defensible too: no tasks, but never a wrong option
    if (r.type.endsWith("-auch")) continue;
    const from = elementById(r.from);
    const to = elementById(r.to);
    if (from.level > level || to.level > level) continue;
    const topic = topicOf(r.type, from);
    tasks.push({
      key: `beziehung:${r.type}:${r.from}:${r.to}:f`,
      type: r.type,
      subject: r.from,
      answer: r.to,
      dir: "f",
      topic,
    });
    tasks.push({
      key: `beziehung:${r.type}:${r.from}:${r.to}:r`,
      type: r.type,
      subject: r.to,
      answer: r.from,
      dir: "r",
      topic,
    });
  }
  return tasks;
}

export function taskKey(kind: TaskKind, target: string): string {
  return `${kind}:${target}`;
}

/** The keys of all tasks of a level and a set of topics: the whole of what there is to learn there. */
export function taskKeys(level: number, topics: readonly string[]): string[] {
  if (level === 1) {
    return ELEMENTS.filter((e) => e.level <= level && topics.includes(e.kind)).map((e) => taskKey("erkennen", e.id));
  }
  if (level === 2)
    return relationTasks(level)
      .filter((t) => topics.includes(t.topic))
      .map((t) => t.key);
  const inScope = ELEMENTS.filter((e) => e.level <= level && topics.includes(e.kind));
  if (level === 3) return inScope.map((e) => taskKey("zeigen", e.id));
  return inScope.flatMap((e) => [taskKey("setzen", e.id), taskKey("tippen", e.id)]);
}

/** The elements that are right answers to the same question: the answers of the same relation to the same subject. */
export function rightAnswers(type: string, subject: string, also = false): Set<string> {
  const answers = new Set<string>();
  for (const r of RELATIONS) {
    if (r.type !== type && !(also && r.type === `${type}-auch`)) continue;
    if (r.from === subject) answers.add(r.to);
    if (r.to === subject) answers.add(r.from);
  }
  return answers;
}

/** Three wrong options: elements of the same kind as the right one, not right themselves, from the six nearest to the subject. */
function wrongOptions(
  answer: Element,
  subject: Element,
  not: ReadonlySet<string>,
  level: number,
  rng: number,
): [string[], number] {
  const near = ELEMENTS.filter(
    (e) => e.kind === answer.kind && !not.has(e.id) && e.id !== answer.id && e.id !== subject.id && e.level <= level,
  )
    .map((e) => ({ id: e.id, km: distanceKm(e.centre, subject.centre) }))
    .sort((a, b) => a.km - b.km || a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((e) => e.id);
  const [mixed, next] = shuffle(near, rng);
  return [mixed.slice(0, OPTIONS - 1), next];
}

/** One task for a key: the options are drawn from the generator. */
function makeTask(key: string, level: number, rng: number): [Task, number] {
  const parts = key.split(":");
  if (parts[0] === "beziehung") {
    const [, type = "", from = "", to = "", dir = "f"] = parts;
    const subject = dir === "f" ? from : to;
    const answer = dir === "f" ? to : from;
    const [wrong, afterWrong] = wrongOptions(
      elementById(answer),
      elementById(subject),
      rightAnswers(type, subject, true),
      level,
      rng,
    );
    const [options, next] = shuffle([answer, ...wrong], afterWrong);
    return [
      { key, kind: "beziehung", subject, target: answer, relation: type, dir: dir === "r" ? "r" : "f", options },
      next,
    ];
  }
  const target = parts[1] ?? "";
  if (parts[0] === "zeigen" || parts[0] === "setzen" || parts[0] === "tippen") {
    return [{ key, kind: parts[0], subject: target, target, options: [] }, rng];
  }
  const element = elementById(target);
  const [wrong, afterWrong] = wrongOptions(element, element, new Set([target]), level, rng);
  const [options, next] = shuffle([target, ...wrong], afterWrong);
  return [{ key, kind: "erkennen", subject: target, target, options }, next];
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
