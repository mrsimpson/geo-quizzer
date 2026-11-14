// The app's logic: pure TypeScript without DOM; the runtime keeps the state and calls start and step
// (@lernapps/app-templates/interactive). Randomness only from the seed.
//
// A round has ten tasks. Every answer goes into the progress at once, so that "Ich brauche eine Pause" loses nothing:
// the progress is what the learner can do, the round is only how it is practised. The root component saves the
// progress on the device and hands it back with the action "load".
import type { Input } from "@lernapps/app-templates/interactive";
import { elementById, KINDS } from "./data.ts";
import { distanceKm, FRAME, type Position } from "./geo.ts";
import { evaluatePick } from "./pick.ts";
import { parseProgress, record, type Progress } from "./progress.ts";
import { buildRound, SHOWS_DISTANCE, type Task } from "./tasks.ts";
import { matchName } from "./typing.ts";

export type Phase = "menu" | "asking" | "feedback" | "summary";

/** The answer to the task being asked, once given. */
export interface Answer {
  /** The element the learner chose or typed the name of; "" when pointing at the map, or when no name was meant. */
  readonly chosen: string;
  readonly right: boolean;
  /** Where the learner pointed (zeigen, setzen), and the nearest point of the right element. */
  readonly point: Position | null;
  readonly nearest: Position | null;
  /** What the learner typed (tippen). */
  readonly typed: string | null;
  /**
   * Kilometres between the middle of the chosen element and the right one (0 when right), rounded to 10; null for
   * kinds of tasks that do not show a distance (see SHOWS_DISTANCE).
   */
  readonly km: number | null;
}

export interface State {
  seed: number;
  /** The state of the generator, see random.ts. */
  rng: number;
  level: number;
  topics: string[];
  progress: Progress;
  phase: Phase;
  tasks: Task[];
  index: number;
  answer: Answer | null;
  /** Where the learner has put the pin on the map, before "Hier setzen" (zeigen, setzen). */
  pin: Position | null;
  /** What the learner has typed so far (tippen). */
  typed: string;
  /** Right answers at first try in this round. */
  right: number;
  /** Right answers in a row. */
  streak: number;
}

const DEFAULT_TOPICS = ["land"];

/** The level a route id stands for: `stufe-1` to `stufe-4`; the first level for anything else. */
function levelOf(route: string): number {
  const match = /^stufe-([1-4])$/.exec(route);
  return match?.[1] === undefined ? 1 : Number(match[1]);
}

export function start(seed: number, route: string): State {
  return {
    seed,
    rng: seed >>> 0,
    level: levelOf(route),
    topics: [...DEFAULT_TOPICS],
    progress: {},
    phase: "menu",
    tasks: [],
    index: 0,
    answer: null,
    pin: null,
    typed: "",
    right: 0,
    streak: 0,
  };
}

/** The task being asked. */
export function currentTask(state: State): Task | undefined {
  return state.tasks[state.index];
}

function answer(state: State, chosen: string): State {
  const task = currentTask(state);
  if (state.phase !== "asking" || task === undefined || !task.options.includes(chosen)) return state;
  const right = chosen === task.target;
  let km: number | null = null;
  if (SHOWS_DISTANCE[task.kind]) {
    km = right ? 0 : Math.round(distanceKm(elementById(chosen).centre, elementById(task.target).centre) / 10) * 10;
  }
  return {
    ...state,
    phase: "feedback",
    answer: { chosen, right, km, point: null, nearest: null, typed: null },
    progress: record(state.progress, task.key, right),
    right: state.right + (right ? 1 : 0),
    streak: right ? state.streak + 1 : 0,
  };
}

/** The state after an answer to the task being asked: the answer, the progress, the count. */
function finish(state: State, task: Task, given: Answer): State {
  return {
    ...state,
    phase: "feedback",
    answer: given,
    pin: null,
    progress: record(state.progress, task.key, given.right),
    right: state.right + (given.right ? 1 : 0),
    streak: given.right ? state.streak + 1 : 0,
  };
}

const inFrame = (value: unknown): value is Position =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number" &&
  value[0] >= FRAME.west &&
  value[0] <= FRAME.east &&
  value[1] >= FRAME.south &&
  value[1] <= FRAME.north;

/** Puts the pin where the learner pointed. */
function pin(state: State, point: unknown): State {
  const task = currentTask(state);
  if (state.phase !== "asking" || (task?.kind !== "zeigen" && task?.kind !== "setzen") || !inFrame(point)) return state;
  return { ...state, pin: [point[0], point[1]] };
}

/** "Hier setzen": the pin counts as the answer. */
function confirmPin(state: State): State {
  const task = currentTask(state);
  if (state.phase !== "asking" || (task?.kind !== "zeigen" && task?.kind !== "setzen") || state.pin === null) {
    return state;
  }
  const result = evaluatePick(elementById(task.target), state.pin);
  return finish(state, task, {
    chosen: "",
    right: result.right,
    km: result.km,
    point: state.pin,
    nearest: result.nearest,
    typed: null,
  });
}

function type(state: State, text: unknown): State {
  const task = currentTask(state);
  if (state.phase !== "asking" || task?.kind !== "tippen" || typeof text !== "string") return state;
  return { ...state, typed: text.slice(0, 60) };
}

/** "Prüfen": the typed text is the answer when it stands for the right name. */
function check(state: State): State {
  const task = currentTask(state);
  if (state.phase !== "asking" || task?.kind !== "tippen" || state.typed.trim() === "") return state;
  const found = matchName(elementById(task.target).kind, state.typed);
  return finish(state, task, {
    chosen: found ?? "",
    right: found === task.target,
    km: null,
    point: null,
    nearest: null,
    typed: state.typed,
  });
}

function next(state: State): State {
  if (state.phase !== "feedback") return state;
  if (state.index + 1 < state.tasks.length) {
    return { ...state, phase: "asking", index: state.index + 1, answer: null, pin: null, typed: "" };
  }
  return { ...state, phase: "summary", answer: null, pin: null, typed: "" };
}

function begin(state: State): State {
  if (state.phase !== "menu") return state;
  const [tasks, rng] = buildRound(state.progress, state.level, state.topics, state.rng);
  if (tasks.length === 0) return state;
  return { ...state, rng, phase: "asking", tasks, index: 0, answer: null, pin: null, typed: "", right: 0, streak: 0 };
}

function toMenu(state: State): State {
  if (state.phase === "menu") return state;
  return { ...state, phase: "menu", tasks: [], index: 0, answer: null, pin: null, typed: "" };
}

function setLevel(state: State, level: number): State {
  if (state.phase !== "menu") return state;
  return { ...state, level };
}

function toggleTopic(state: State, topic: unknown): State {
  if (state.phase !== "menu" || typeof topic !== "string" || !(KINDS as readonly string[]).includes(topic))
    return state;
  const has = state.topics.includes(topic);
  if (has && state.topics.length === 1) return state;
  const topics = has
    ? state.topics.filter((t) => t !== topic)
    : KINDS.filter((k) => k === topic || state.topics.includes(k));
  return { ...state, topics };
}

export function step(state: State, input: Input): State {
  if (input.kind === "key") {
    const task = currentTask(state);
    if (input.key === "Escape") return toMenu(state);
    if (state.phase === "feedback" && (input.key === "Enter" || input.key === " ")) return next(state);
    if (state.phase === "asking" && input.key === "Enter" && state.pin !== null) return confirmPin(state);
    if (state.phase === "asking" && task !== undefined && /^[1-9]$/.test(input.key)) {
      const chosen = task.options[Number(input.key) - 1];
      return chosen === undefined ? state : answer(state, chosen);
    }
    return state;
  }
  switch (input.name) {
    case "load":
      return { ...state, progress: parseProgress(input.value) };
    case "level":
      return typeof input.value === "number" && Number.isInteger(input.value) && input.value >= 1 && input.value <= 4
        ? setLevel(state, input.value)
        : state;
    case "topic":
      return toggleTopic(state, input.value);
    case "start":
      return begin(state);
    case "answer":
      return typeof input.value === "string" ? answer(state, input.value) : state;
    case "pin":
      return pin(state, input.value);
    case "confirm":
      return confirmPin(state);
    case "type":
      return type(state, input.value);
    case "check":
      return check(state);
    case "next":
      return next(state);
    case "pause":
    case "menu":
      return toMenu(state);
    default:
      return state;
  }
}
