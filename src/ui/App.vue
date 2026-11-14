<script setup lang="ts">
// The game. Menu: the topics and the stars. Round: the map, the question, four names, then the feedback with the
// distance, a fact and where to read more. The progress is kept on the device. The runtime gives the component the
// core's state and steps every key typed on the page; the buttons emit actions as input.
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { announce, moveFocus } from "@lernapps/tooling/a11y";
import { translator } from "@lernapps/tooling/i18n";
import { createStorage } from "@lernapps/tooling/storage";
import type { Input } from "@lernapps/app-templates/interactive";
import { KINDS, RELATIONS, elementById } from "../core/data.ts";
import { compass, type Position } from "../core/geo.ts";
import { suggestions } from "../core/typing.ts";
import { currentTask, type State } from "../core/index.ts";
import { stars } from "../core/progress.ts";
import { rightAnswers, taskKeys } from "../core/tasks.ts";
import de from "../messages/de.json";
import EuropeMap, { type Mark } from "./EuropeMap.vue";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const t = translator(de as Record<string, string>);
const has = (key: string): boolean => key in de;

const storage = createStorage("geo-quizzer");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

onMounted(() => {
  const saved = storage.load("progress", isRecord);
  if (saved !== undefined) emit("input", { kind: "action", name: "load", value: saved as never });
});

watch(
  () => props.state.pin,
  (point) => {
    if (point !== null) announce(t("pinSet"));
  },
);

watch(
  () => props.state.progress,
  (progress) => {
    storage.save("progress", progress);
  },
);

const act = (name: string, value?: string): void => {
  emit("input", value === undefined ? { kind: "action", name } : { kind: "action", name, value });
};
const pick = (point: Position): void => {
  emit("input", { kind: "action", name: "pin", value: [point[0], point[1]] });
};

const name = (id: string): string => t(`el.${id}.name`);
/** The name with its article ("die Niederlande", "der Rhein") where it needs one, for sentences. */
const nameA = (id: string): string => (has(`el.${id}.article`) ? `${t(`el.${id}.article`)} ${name(id)}` : name(id));
const task = computed(() => currentTask(props.state));
const playing = computed(() => props.state.phase !== "menu");
const target = computed(() => (task.value === undefined ? undefined : elementById(task.value.target)));
/** The element the task is about: the marked one; the target itself in Stufe 1. */
const subject = computed(() => (task.value === undefined ? undefined : elementById(task.value.subject)));
const kindOfTarget = computed(() => subject.value?.kind ?? "land");

/** Whether the learner points at the map (Stufen 3 and 4) or types a name (Stufe 4). */
const isPick = computed(() => task.value?.kind === "zeigen" || task.value?.kind === "setzen");
const isTyping = computed(() => task.value?.kind === "tippen");
const detail = computed<"borders" | "coast">(() => (props.state.level === 4 ? "coast" : "borders"));

const question = computed(() => {
  const current = task.value;
  if (isPick.value && subject.value !== undefined) {
    const done = props.state.phase === "feedback";
    return t(done ? "askPointDone" : `askPoint.${subject.value.kind}`, {
      subject: done ? nameA(subject.value.id) : name(subject.value.id),
    });
  }
  if (isTyping.value && props.state.phase === "asking") return t(`askType.${kindOfTarget.value}`);
  if (current?.kind === "beziehung" && current.relation !== undefined && subject.value !== undefined) {
    const direction = current.dir ?? "f";
    const kind = direction === "f" ? subject.value.kind : (target.value?.kind ?? "");
    const suffix = current.relation === "liegt-in" ? `.${kind}` : "";
    const named = subject.value.kind === "fluss" || subject.value.kind === "see" ? nameA : name;
    return t(`q.${current.relation}.${direction}${suffix}`, { subject: named(subject.value.id) });
  }
  const done = props.state.phase === "feedback";
  return t(`${done ? "askDone" : "ask"}.${kindOfTarget.value}`);
});
const mapLabel = computed(() =>
  isPick.value && subject.value !== undefined
    ? t("mapLabel.point", { subject: name(subject.value.id) })
    : task.value?.kind === "beziehung" && subject.value !== undefined
      ? t("mapLabel.relation", { subject: name(subject.value.id) })
      : t(`mapLabel.${kindOfTarget.value}`),
);

const feedback = computed(
  () => props.state.phase === "feedback" && task.value !== undefined && props.state.answer !== null,
);
/** The colours of several right answers: one each, so that the map and the list agree. */
const PALETTE = [
  "#2e9e5b",
  "#8e5bd6",
  "#1f9bb3",
  "#d4579a",
  "#9c7a1d",
  "#5f6fd6",
  "#0f766e",
  "#7a4b2a",
  "#84a52c",
  "#8a2a6b",
] as const;

/** Where several answers are right (several neighbours), all of them, the one asked for first. */
const manyRight = computed<string[]>(() => {
  const current = task.value;
  if (current?.kind !== "beziehung" || current.relation === undefined || subject.value === undefined) return [];
  const all = [...rightAnswers(current.relation, subject.value.id, target.value?.kind ?? "land")]
    .filter((id) => id !== current.target)
    .sort((a, b) => name(a).localeCompare(name(b), "de"));
  return all.length === 0 ? [] : [current.target, ...all];
});
const colorOf = (id: string): string => PALETTE[Math.max(0, manyRight.value.indexOf(id)) % PALETTE.length] ?? "#2e9e5b";

const marks = computed<Mark[]>(() => {
  if (target.value === undefined || subject.value === undefined) return [];
  if (!feedback.value || props.state.answer === null) {
    // where learners point, the map does not show what they look for
    return isPick.value ? [] : [{ id: subject.value.id, role: "asked" }];
  }
  const result: Mark[] =
    manyRight.value.length > 1
      ? manyRight.value.map((id) => ({ id, role: "right" as const, color: colorOf(id) }))
      : [{ id: target.value.id, role: "right" }];
  if (props.state.answer.chosen !== "" && !props.state.answer.right) {
    result.unshift({ id: props.state.answer.chosen, role: "chosen" });
  }
  if (subject.value.id !== target.value.id) result.unshift({ id: subject.value.id, role: "asked" });
  return result;
});
/** The dashed line from the learner's pin to the nearest point of the right element, where learners point. */
const line = computed(() => {
  const answer = props.state.answer;
  if (!feedback.value || answer === null || answer.km === null || answer.km === 0) return undefined;
  if (answer.point === null || answer.nearest === null) return undefined;
  return { from: answer.point, to: answer.nearest, label: t("kmLabel", { km: answer.km }) };
});

/** How the pin is drawn: waiting for "Hier setzen", or right or wrong after it. */
const pinRole = computed<"pending" | "right" | "wrong">(() =>
  !feedback.value ? "pending" : props.state.answer?.right === true ? "right" : "wrong",
);

/** The pin on the map: the learner's, before and after "Hier setzen". */
const pinShown = computed<Position | null>(() =>
  feedback.value ? (props.state.answer?.point ?? null) : props.state.pin,
);

const typedValue = computed({
  get: () => props.state.typed,
  set: (text: string) => emit("input", { kind: "action", name: "type", value: text }),
});
const suggested = computed(() =>
  isTyping.value && target.value !== undefined ? suggestions(target.value.kind, props.state.typed) : [],
);
const wasSpelledOtherwise = computed(
  () =>
    props.state.answer?.right === true &&
    props.state.answer.typed !== null &&
    props.state.answer.typed !== name(target.value?.id ?? ""),
);

/** What the learner may read about the right element, once answered: how it is related to the others. */
const relationText = computed(() => {
  const element = subject.value;
  if (element === undefined) return "";
  const from = (type: string): string[] =>
    RELATIONS.filter((r) => r.type === type && r.from === element.id).map((r) => r.to);
  const to = (type: string): string[] =>
    RELATIONS.filter((r) => r.type === type && r.to === element.id).map((r) => r.from);
  const list = (ids: string[]): string => ids.map(name).join(", ");
  const texts: string[] = [];
  if (element.kind === "land") {
    const city = to("hauptstadt-von")[0];
    if (city !== undefined) texts.push(t("rel.hasCapital", { country: name(element.id), city: name(city) }));
    const region = from("gehoert-zu")[0];
    if (region !== undefined) texts.push(t("rel.partOf", { country: name(element.id), region: name(region) }));
  } else if (element.kind === "stadt") {
    const country = from("hauptstadt-von")[0];
    if (country !== undefined) texts.push(t("rel.capitalOf", { city: name(element.id), country: name(country) }));
  } else if (element.kind === "fluss") {
    const countries = from("fliesst-durch");
    if (countries.length > 0)
      texts.push(t("rel.flowsThrough", { river: name(element.id), countries: list(countries) }));
  } else if (element.kind === "gebirge" || element.kind === "see") {
    const countries = from("liegt-in");
    if (countries.length > 0)
      texts.push(
        t(countries.length === 1 ? "rel.liesInOne" : "rel.liesInMany", {
          place: name(element.id),
          countries: list(countries),
        }),
      );
  } else if (element.kind === "raum") {
    const countries = to("gehoert-zu").slice(0, 5);
    texts.push(t("rel.members", { region: name(element.id), countries: list(countries) }));
  }
  return texts.join(" ");
});
const fact = computed(() =>
  target.value !== undefined && has(`el.${target.value.id}.fact`) ? t(`el.${target.value.id}.fact`) : "",
);
const link = computed(() =>
  target.value !== undefined && has(`el.${target.value.id}.link`) ? t(`el.${target.value.id}.link`) : "",
);

const direction = computed(() => {
  const answer = props.state.answer;
  if (answer === null || answer.right || answer.km === null || target.value === undefined) return "";
  const from = answer.point ?? (answer.chosen === "" ? undefined : elementById(answer.chosen).centre);
  const towards = answer.nearest ?? target.value.centre;
  return from === undefined ? "" : t(`dir${compass(from, towards)}`);
});

/**
 * What the feedback says about the answer: first and large the right answer, then, smaller, what the learner did.
 * Where several answers are right, the others follow the learner's own.
 */
const detailParts = computed<{ primary: string; secondary: string }>(() => {
  const answer = props.state.answer;
  if (answer === null || target.value === undefined) return { primary: "", secondary: "" };
  const target_ = nameA(target.value.id);
  if (isPick.value) {
    if (answer.right) return { primary: t("hitDetail", { target: target_ }), secondary: "" };
    return {
      primary: t("missRight", { target: target_ }),
      secondary: t("missOwn", { km: answer.km ?? 0, direction: direction.value }),
    };
  }
  if (isTyping.value) {
    if (answer.right) {
      return {
        primary: wasSpelledOtherwise.value
          ? t("typedSpelling", { target: name(target.value.id) })
          : t("rightDetail", { target: target_ }),
        secondary: "",
      };
    }
    return { primary: t("wrongRight", { target: target_ }), secondary: t("typedOwn", { typed: answer.typed ?? "" }) };
  }
  if (manyRight.value.length > 1) {
    // the list of all right answers follows in the template
    return answer.right
      ? { primary: t("rightMany"), secondary: "" }
      : { primary: t("wrongMany"), secondary: t("wrongOwn", { chosen: nameA(answer.chosen) }) };
  }
  if (answer.right) return { primary: t("rightDetail", { target: target_ }), secondary: "" };
  return { primary: t("wrongRight", { target: target_ }), secondary: t("wrongOwn", { chosen: nameA(answer.chosen) }) };
});
const detailText = computed(() => `${detailParts.value.primary} ${detailParts.value.secondary}`.trim());

const levelTitle = computed(() => t(`level${props.state.level}`));
const levelKeys = (level: number, kinds: readonly string[]) => taskKeys(level, kinds);
const starsOf = (kinds: readonly string[]): number => stars(props.state.progress, levelKeys(props.state.level, kinds));
const starText = (count: number): string => "★".repeat(count) + "☆".repeat(3 - count);
const noTasks = computed(() => levelKeys(props.state.level, props.state.topics).length === 0);

const nextButton = ref<HTMLButtonElement | null>(null);
const questionHeading = ref<HTMLElement | null>(null);
const typedInput = ref<HTMLInputElement | null>(null);
const summaryHeading = ref<HTMLElement | null>(null);

watch(
  () => [props.state.phase, props.state.index] as const,
  async ([phase], [previous]) => {
    const { answer } = props.state;
    if (phase === "feedback" && answer !== null) {
      if (isPick.value || isTyping.value) announce(`${answer.right ? t("right") : t("wrong")} ${detailText.value}`);
      else {
        announce(
          answer.right
            ? t("announceRight", { target: nameA(target.value?.id ?? "") })
            : manyRight.value.length > 1
              ? t("announceWrongMany", { chosen: nameA(answer.chosen) })
              : t("announceWrong", { target: nameA(target.value?.id ?? ""), chosen: nameA(answer.chosen) }),
        );
      }
      await nextTick();
      if (nextButton.value !== null) moveFocus(nextButton.value);
    } else if (phase === "asking") {
      announce(
        `${t("progress", { index: props.state.index + 1, total: props.state.tasks.length })}. ${question.value}`,
      );
      await nextTick();
      if (isTyping.value && typedInput.value !== null) moveFocus(typedInput.value);
      else if (questionHeading.value !== null) moveFocus(questionHeading.value);
    } else if (phase === "menu" && previous !== undefined && previous !== "menu") {
      announce(t("announcePause"));
    } else if (phase === "summary") {
      announce(t("summary", { right: props.state.right, total: props.state.tasks.length }));
      await nextTick();
      if (summaryHeading.value !== null) moveFocus(summaryHeading.value);
    }
  },
);
</script>

<template>
  <section :class="['geo', { playing }]" :aria-label="t('app')">
    <!-- Menu -->
    <div v-if="state.phase === 'menu'" class="menu">
      <p class="menu-intro">{{ t("menuIntro") }}</p>
      <h2 class="menu-title">{{ levelTitle }}</h2>
      <p class="menu-stars">
        <span aria-hidden="true">{{ starText(starsOf(state.topics)) }}</span>
        <span class="sr-only">{{ t("starsLabel") }}: {{ t("stars", { count: starsOf(state.topics) }) }}</span>
      </p>
      <p class="menu-hint">{{ t(`stageHint.${state.level}`) }}</p>
      <p class="menu-hint">{{ t("starsHint") }}</p>
      <h3 class="menu-topics">{{ t("levels") }}</h3>
      <ul class="levels">
        <li v-for="n in [1, 2, 3, 4]" :key="n">
          <button
            type="button"
            class="topic"
            :aria-pressed="state.level === n"
            :disabled="levelKeys(n, KINDS).length === 0"
            @click="emit('input', { kind: 'action', name: 'level', value: n })"
          >
            <span>{{ t(`level${n}`) }}</span>
            <span class="topic-stars" aria-hidden="true">{{
              starText(stars(state.progress, levelKeys(n, KINDS)))
            }}</span>
            <span class="sr-only">{{ t("stars", { count: stars(state.progress, levelKeys(n, KINDS)) }) }}</span>
          </button>
        </li>
      </ul>
      <h3 class="menu-topics">{{ t("topics") }}</h3>
      <ul class="topics">
        <li v-for="kind in KINDS" :key="kind">
          <button
            type="button"
            class="topic"
            :aria-pressed="state.topics.includes(kind)"
            :disabled="levelKeys(state.level, [kind]).length === 0"
            @click="act('topic', kind)"
          >
            <span
              >{{ state.topics.includes(kind) ? "✓ " : ""
              }}{{ t(`${state.level === 2 ? "kind2" : "kind"}.${kind}`) }}</span
            >
            <span class="topic-stars" aria-hidden="true">{{ starText(starsOf([kind])) }}</span>
            <span class="sr-only">{{ t("stars", { count: starsOf([kind]) }) }}</span>
          </button>
        </li>
      </ul>
      <p v-if="KINDS.some((kind) => levelKeys(state.level, [kind]).length === 0)" class="menu-hint">
        {{ t("topicDisabled") }}
      </p>
      <p v-if="noTasks" class="menu-empty">{{ t("empty") }}</p>
      <button v-else type="button" class="primary" @click="act('start')">{{ t("start") }}</button>
    </div>

    <!-- Round: the whole screen -->
    <div v-else class="round" @keydown.esc="act('pause')">
      <div class="portrait-note" role="note">
        <p>{{ t("rotate") }}</p>
        <button type="button" class="pause" @click="act('pause')">{{ t("toMenu") }}</button>
      </div>
      <header class="bar">
        <h2 class="bar-title">{{ levelTitle }}</h2>
        <p class="bar-progress">
          <span v-if="state.phase !== 'summary'">{{
            t("progress", { index: state.index + 1, total: state.tasks.length })
          }}</span>
          <span v-if="state.phase !== 'summary'"> · {{ t("rightCount", { count: state.right }) }}</span>
          <span v-if="state.streak > 1"> · {{ t("streak", { count: state.streak }) }}</span>
        </p>
        <button type="button" class="pause" @click="act('pause')">{{ t("pause") }}</button>
      </header>

      <div v-if="state.phase === 'summary'" class="summary">
        <h2 ref="summaryHeading" tabindex="-1">{{ t("summaryTitle") }}</h2>
        <p>{{ t("summary", { right: state.right, total: state.tasks.length }) }}</p>
        <p class="summary-hint">{{ t("summaryHint") }}</p>
        <p class="menu-stars">
          <span aria-hidden="true">{{ starText(starsOf(state.topics)) }}</span>
          <span class="sr-only">{{ t("stars", { count: starsOf(state.topics) }) }}</span>
        </p>
        <div class="actions">
          <button type="button" class="primary" @click="act('menu')">{{ t("menu") }}</button>
        </div>
      </div>

      <div v-else class="board">
        <EuropeMap
          :marks="marks"
          :line="line"
          :label="mapLabel"
          :reset-key="state.index"
          :detail="detail"
          :pickable="isPick && state.phase === 'asking'"
          :pin="pinShown"
          :pin-role="pinRole"
          :show-names="feedback"
          @pick="pick"
        />
        <div class="panel">
          <h3 ref="questionHeading" tabindex="-1" class="question">{{ question }}</h3>
          <ol v-if="task !== undefined && state.phase === 'asking' && task.options.length > 0" class="options">
            <li v-for="(id, i) in task.options" :key="id">
              <button type="button" class="option" @click="act('answer', id)">
                <span class="option-number" aria-hidden="true">{{ i + 1 }}</span
                >{{ name(id) }}
              </button>
            </li>
          </ol>
          <div v-else-if="task !== undefined && state.phase === 'asking' && isPick" class="pick">
            <p>{{ t("pickHint") }}</p>
            <button type="button" class="primary" :disabled="state.pin === null" @click="act('confirm')">
              {{ t("place") }}
            </button>
          </div>
          <form
            v-else-if="task !== undefined && state.phase === 'asking' && isTyping"
            class="typing"
            @submit.prevent="act('check')"
          >
            <label for="typed" class="sr-only">{{ t("typedLabel") }}</label>
            <input
              id="typed"
              ref="typedInput"
              v-model="typedValue"
              type="text"
              autocomplete="off"
              autocapitalize="words"
              spellcheck="false"
              :placeholder="t('typedPlaceholder')"
            />
            <ul v-if="suggested.length > 0" class="suggestions" :aria-label="t('suggestions')">
              <li v-for="id in suggested" :key="id">
                <button type="button" class="suggestion" @click="typedValue = name(id)">{{ name(id) }}</button>
              </li>
            </ul>
            <button type="submit" class="primary" :disabled="state.typed.trim() === ''">{{ t("check") }}</button>
          </form>
          <div v-else-if="state.answer !== null" class="feedback" role="group" :aria-label="t('feedback')">
            <p :class="['verdict', state.answer.right ? 'right' : 'wrong']">
              {{ state.answer.right ? t("right") : t("wrong") }}
            </p>
            <p class="answer-main">{{ detailParts.primary }}</p>
            <ul v-if="manyRight.length > 1" class="right-list">
              <li v-for="id in manyRight" :key="id">
                <span class="swatch" :style="{ background: colorOf(id) }" aria-hidden="true"></span>{{ name(id)
                }}<span v-if="id === state.answer.chosen" class="sr-only"> ({{ t("yourChoice") }})</span>
              </li>
            </ul>
            <p v-if="detailParts.secondary" class="answer-own">{{ detailParts.secondary }}</p>
            <p v-if="relationText">{{ relationText }}</p>
            <template v-if="fact">
              <p class="fact-title">{{ t("factTitle") }}</p>
              <p>{{ fact }}</p>
            </template>
            <p v-if="link">
              <a :href="link" target="_blank" rel="noopener"
                >{{ t("readMore") }} <span aria-hidden="true">↗</span>
                <span class="sr-only">({{ t("opensNew") }})</span></a
              >
            </p>
            <div class="feedback-actions">
              <button ref="nextButton" type="button" class="primary" @click="act('next')">{{ t("next") }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
:root {
  --page-max-width: 60rem;
}
</style>

<style scoped>
.geo {
  --geo-sea: #cfe6f2;
  --geo-land: #efe8d2;
  --geo-context: #cfcfc8;
  --geo-border: #6f6a5a;
  --geo-ink: #1d2b3a;
  --geo-asked: #f28c28;
  --geo-right: #3fae6a;
  --geo-chosen: #b4534b;
  --geo-muted: #4a5663;
  --geo-river: #5f9fc7;
  --geo-button: #ffffff;
  --geo-focus: #1a56db;
  --geo-surface: #ffffff;
  --geo-bg: #f4f1ea;
  --geo-surface-halo: rgba(255, 255, 255, 0.85);
  color: var(--geo-ink);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .geo {
    --geo-sea: #17303f;
    --geo-land: #4a4635;
    --geo-context: #2c3238;
    --geo-border: #9a9378;
    --geo-ink: #eef2f6;
    --geo-asked: #f59a3e;
    --geo-right: #4cc17c;
    --geo-chosen: #d9857d;
    --geo-muted: #b8c2cc;
    --geo-river: #4a8ab5;
    --geo-button: #25313d;
    --geo-focus: #8ab4ff;
    --geo-surface: #1d2733;
    --geo-bg: #121a22;
    --geo-surface-halo: rgba(18, 26, 34, 0.85);
  }
}

:root[data-theme="dark"] .geo {
  --geo-sea: #17303f;
  --geo-land: #4a4635;
  --geo-context: #2c3238;
  --geo-border: #9a9378;
  --geo-ink: #eef2f6;
  --geo-asked: #f59a3e;
  --geo-right: #4cc17c;
  --geo-chosen: #d9857d;
  --geo-muted: #b8c2cc;
  --geo-river: #4a8ab5;
  --geo-button: #25313d;
  --geo-focus: #8ab4ff;
  --geo-surface: #1d2733;
  --geo-bg: #121a22;
  --geo-surface-halo: rgba(18, 26, 34, 0.85);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

button {
  font: inherit;
  cursor: pointer;
}

button:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid var(--geo-focus);
  outline-offset: 2px;
}

.primary {
  min-height: 3rem;
  padding: 0.5rem 1.5rem;
  border: 2px solid var(--geo-right);
  border-radius: 0.75rem;
  background: var(--geo-right);
  color: #06210f;
  font-weight: 700;
  font-size: 1.125rem;
}

/* Menu */
.menu {
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--geo-surface);
}

.menu-title {
  margin: 0.5rem 0 0;
}

.menu-stars {
  margin: 0;
  color: var(--geo-asked);
  font-size: 1.75rem;
  letter-spacing: 0.1em;
}

.menu-hint {
  margin: 0 0 1rem;
}

.levels,
.topics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;
}

.topic {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 7rem;
  padding: 0.5rem 1rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.75rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-weight: 700;
}

.topic:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.topic[aria-pressed="true"] {
  background: var(--geo-asked);
  color: #1d1305;
}

.topic-stars {
  font-size: 0.875rem;
  letter-spacing: 0.1em;
}

/* Round: over the whole screen */
.playing .round {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--geo-bg);
}

.bar {
  display: flex;
  flex: none;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.bar-title {
  margin: 0;
  font-size: 1.25rem;
}

.bar-progress {
  flex: 1;
  margin: 0;
  text-align: center;
}

.pause {
  padding: 0.4rem 0.75rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.5rem;
  background: var(--geo-button);
  color: var(--geo-ink);
}

.board {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 22rem);
  gap: 0.75rem;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
  padding: 0.75rem;
  overflow: auto;
  border: 2px solid var(--geo-ink);
  border-radius: 0.75rem;
  background: var(--geo-surface);
}

.question {
  margin: 0;
  font-size: 1.25rem;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.option {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  min-height: 3rem;
  padding: 0.25rem 0.75rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.75rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-size: 1.125rem;
  font-weight: 600;
  text-align: left;
}

.option-number {
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--geo-ink);
  color: var(--geo-surface);
  font-size: 0.875rem;
}

.feedback {
  padding-bottom: 0.5rem;
}

.feedback p {
  margin: 0 0 0.5rem;
}

.panel {
  scrollbar-gutter: stable;
}

.verdict {
  font-size: 1.375rem;
  font-weight: 800;
}

.verdict.right {
  color: var(--geo-right);
}

.verdict.wrong {
  color: var(--geo-chosen);
}

.feedback .answer-main {
  font-size: 1.25rem;
  font-weight: 800;
}

.right-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
  font-weight: 600;
}

.swatch {
  display: inline-block;
  width: 0.875rem;
  height: 0.875rem;
  margin-right: 0.375rem;
  border: 2px solid var(--geo-ink);
  border-radius: 50%;
  vertical-align: -0.125rem;
}

.feedback .answer-own {
  color: var(--geo-muted);
  font-size: 0.875rem;
}

.fact-title {
  font-weight: 700;
}

.summary {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.portrait-note {
  display: none;
}

.feedback-actions {
  position: sticky;
  bottom: -0.75rem;
  margin: 0 -0.25rem;
  padding: 0.5rem 0.25rem 0.25rem;
  background: var(--geo-surface);
}

.pick p {
  margin: 0 0 0.5rem;
}

.typing {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.typing input {
  width: 100%;
  min-height: 3rem;
  padding: 0.25rem 0.75rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.75rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font: inherit;
  font-size: 1.125rem;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestion {
  min-height: 2.5rem;
  padding: 0.25rem 0.75rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.75rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-weight: 600;
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.summary-hint {
  max-width: 28rem;
}

/* A phone held upright: the game needs the width of the landscape format. */
@media (orientation: portrait) and (max-width: 600px) {
  .bar,
  .board,
  .summary {
    visibility: hidden;
  }

  .portrait-note {
    flex-direction: column;
    gap: 1rem;
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--geo-bg);
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
  }
}

@media (max-height: 480px) {
  .summary {
    justify-content: flex-start;
    overflow: auto;
  }

  .summary h2,
  .summary p {
    margin: 0.25rem 0;
  }

  .summary .menu-stars {
    font-size: 1.25rem;
  }

  .playing .round {
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
  }

  .bar-title {
    display: none;
  }

  .bar-progress {
    text-align: left;
  }

  .pause {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
  }

  .board {
    grid-template-columns: minmax(0, 1fr) minmax(12rem, 38%);
    gap: 0.5rem;
  }

  .panel {
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .feedback p {
    margin-bottom: 0.25rem;
    font-size: 0.9375rem;
  }

  .question {
    font-size: 1.0625rem;
  }

  .option {
    min-height: 2.5rem;
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .option,
  .primary {
    transition: transform 0.1s;
  }

  .option:active,
  .primary:active {
    transform: scale(0.98);
  }
}
</style>
