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
import { compass } from "../core/geo.ts";
import { currentTask, type State } from "../core/index.ts";
import { stars } from "../core/progress.ts";
import { taskKeys } from "../core/tasks.ts";
import de from "../messages/de.json";
import EuropeMap, { type Mark } from "./EuropeMap.vue";

const props = defineProps<{ state: State; lang: string }>();
const emit = defineEmits<{ input: [input: Input] }>();
const t = translator(de as Record<string, string>);
const has = (key: string): boolean => key in de;

const storage = createStorage("geo-europa");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

onMounted(() => {
  const saved = storage.load("progress", isRecord);
  if (saved !== undefined) emit("input", { kind: "action", name: "load", value: saved as never });
});

watch(
  () => props.state.progress,
  (progress) => {
    storage.save("progress", progress);
  },
);

const act = (name: string, value?: string): void => {
  emit("input", value === undefined ? { kind: "action", name } : { kind: "action", name, value });
};

const name = (id: string): string => t(`el.${id}.name`);
const task = computed(() => currentTask(props.state));
const playing = computed(() => props.state.phase !== "menu");
const target = computed(() => (task.value === undefined ? undefined : elementById(task.value.target)));
const kindOfTarget = computed(() => target.value?.kind ?? "land");

const question = computed(() => {
  const done = props.state.phase === "feedback";
  return t(`${kindOfTarget.value === "stadt" ? "askCity" : "askCountry"}${done ? "Done" : ""}`);
});
const mapLabel = computed(() => t(kindOfTarget.value === "stadt" ? "mapLabelCity" : "mapLabelCountry"));

const feedback = computed(
  () => props.state.phase === "feedback" && task.value !== undefined && props.state.answer !== null,
);
const marks = computed<Mark[]>(() => {
  if (target.value === undefined) return [];
  if (!feedback.value || props.state.answer === null) return [{ id: target.value.id, role: "asked" }];
  const result: Mark[] = [{ id: target.value.id, role: "right" }];
  if (!props.state.answer.right) result.unshift({ id: props.state.answer.chosen, role: "chosen" });
  return result;
});
const line = computed(() => {
  const answer = props.state.answer;
  if (!feedback.value || answer === null || answer.right || answer.km === null || target.value === undefined) {
    return undefined;
  }
  return { from: answer.chosen, to: target.value.id, label: t("kmLabel", { km: answer.km }) };
});

/** What the learner may read about the right element, once answered: its relation and a fact. */
const capital = computed(() => {
  const id = target.value?.id;
  return RELATIONS.find((r) => r.type === "hauptstadt-von" && r.to === id)?.from;
});
const country = computed(() => {
  const id = target.value?.id;
  return RELATIONS.find((r) => r.type === "hauptstadt-von" && r.from === id)?.to;
});
const relationText = computed(() => {
  if (target.value === undefined) return "";
  if (target.value.kind === "land" && capital.value !== undefined)
    return t("hasCapital", { country: name(target.value.id), city: name(capital.value) });
  if (target.value.kind === "stadt" && country.value !== undefined)
    return t("capitalOf", { city: name(target.value.id), country: name(country.value) });
  return "";
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
  return t(`dir${compass(elementById(answer.chosen).centre, target.value.centre)}`);
});

const levelTitle = computed(() => t(`level${props.state.level}`));
const levelKeys = (kinds: readonly string[]) => taskKeys(props.state.level, kinds);
const starsOf = (kinds: readonly string[]): number => stars(props.state.progress, levelKeys(kinds));
const starText = (count: number): string => "★".repeat(count) + "☆".repeat(3 - count);
const noTasks = computed(() => levelKeys(props.state.topics).length === 0);

const nextButton = ref<HTMLButtonElement | null>(null);
const questionHeading = ref<HTMLElement | null>(null);
const summaryHeading = ref<HTMLElement | null>(null);

watch(
  () => [props.state.phase, props.state.index] as const,
  async ([phase], [previous]) => {
    const { answer } = props.state;
    if (phase === "feedback" && answer !== null) {
      announce(
        answer.right
          ? t("announceRight", { target: name(target.value?.id ?? "") })
          : t(answer.km === null ? "announceWrong" : "announceWrongKm", {
              target: name(target.value?.id ?? ""),
              chosen: name(answer.chosen),
              km: answer.km ?? 0,
            }),
      );
      await nextTick();
      if (nextButton.value !== null) moveFocus(nextButton.value);
    } else if (phase === "asking") {
      announce(
        `${t("progress", { index: props.state.index + 1, total: props.state.tasks.length })}. ${question.value}`,
      );
      await nextTick();
      if (questionHeading.value !== null) moveFocus(questionHeading.value);
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
      <p class="menu-hint">{{ t("stageHint") }}</p>
      <p class="menu-hint">{{ t("starsHint") }}</p>
      <h3 class="menu-topics">{{ t("topics") }}</h3>
      <ul class="topics">
        <li v-for="kind in KINDS" :key="kind">
          <button type="button" class="topic" :aria-pressed="state.topics.includes(kind)" @click="act('topic', kind)">
            <span>{{ state.topics.includes(kind) ? "✓ " : "" }}{{ t(`kind.${kind}`) }}</span>
            <span class="topic-stars" aria-hidden="true">{{ starText(starsOf([kind])) }}</span>
            <span class="sr-only">{{ t("stars", { count: starsOf([kind]) }) }}</span>
          </button>
        </li>
      </ul>
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
        <EuropeMap :marks="marks" :line="line" :label="mapLabel" :reset-key="state.index" />
        <div class="panel">
          <h3 ref="questionHeading" tabindex="-1" class="question">{{ question }}</h3>
          <ol v-if="task !== undefined && state.phase === 'asking'" class="options">
            <li v-for="(id, i) in task.options" :key="id">
              <button type="button" class="option" @click="act('answer', id)">
                <span class="option-number" aria-hidden="true">{{ i + 1 }}</span
                >{{ name(id) }}
              </button>
            </li>
          </ol>
          <div v-else-if="state.answer !== null" class="feedback" role="group" :aria-label="t('feedback')">
            <p :class="['verdict', state.answer.right ? 'right' : 'wrong']">
              {{ state.answer.right ? t("right") : t("wrong") }}
            </p>
            <p>
              <template v-if="state.answer.right">{{ t("rightDetail", { target: name(target?.id ?? "") }) }}</template>
              <template v-else
                >{{ t("wrongDetail", { chosen: name(state.answer.chosen), target: name(target?.id ?? "") }) }}
                <template v-if="state.answer.km !== null">{{
                  t("distance", {
                    km: state.answer.km,
                    chosen: name(state.answer.chosen),
                    target: name(target?.id ?? ""),
                    direction,
                  })
                }}</template></template
              >
            </p>
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
            <button ref="nextButton" type="button" class="primary" @click="act('next')">{{ t("next") }}</button>
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
  --geo-chosen: #4f86c6;
  --geo-button: #ffffff;
  --geo-focus: #1a56db;
  --geo-surface: #ffffff;
  --geo-bg: #f4f1ea;
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
    --geo-chosen: #78a8e8;
    --geo-button: #25313d;
    --geo-focus: #8ab4ff;
    --geo-surface: #1d2733;
    --geo-bg: #121a22;
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
  --geo-chosen: #78a8e8;
  --geo-button: #25313d;
  --geo-focus: #8ab4ff;
  --geo-surface: #1d2733;
  --geo-bg: #121a22;
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

.feedback p {
  margin: 0 0 0.5rem;
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

.feedback .primary {
  position: sticky;
  bottom: 0;
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
