<script setup lang="ts">
// The map of Europe as SVG: grey land around, the countries, capitals as circles. Elements can be marked (orange: asked
// for, green: the right one, blue: the learner's choice); a dashed line with the distance joins two elements. The
// learner can zoom (buttons, wheel) and move the map (drag, arrow keys when the map has the focus).
import { computed, ref, watch } from "vue";
import { translator } from "@lernapps/tooling/i18n";
import { elementById } from "../core/data.ts";
import { VIEW } from "../core/geo.ts";
import de from "../messages/de.json";
import { AREA_PATHS, CONTEXT_PATH, centreOf } from "./paths.ts";

export interface Mark {
  id: string;
  role: "asked" | "right" | "chosen";
}

const props = defineProps<{
  /** The elements marked, and how. */
  marks: readonly Mark[];
  /** Two element ids a dashed line joins, with its label. */
  line?: { from: string; to: string; label: string } | undefined;
  /** The text for screen readers: what is asked, without the answer. */
  label: string;
  /** Changes with every task: the map shows everything again. */
  resetKey: number;
}>();

const t = translator(de as Record<string, string>);

const ZOOM_MAX = 12;
const view = ref({ x: VIEW.x, y: VIEW.y, width: VIEW.width, height: VIEW.height });

const viewBox = computed(() => `${view.value.x} ${view.value.y} ${view.value.width} ${view.value.height}`);
/** One screen pixel in map units, roughly: sizes of circles and lines stay the same when zoomed. */
const unit = computed(() => view.value.width / 700);

watch(
  () => props.resetKey,
  () => {
    view.value = { x: VIEW.x, y: VIEW.y, width: VIEW.width, height: VIEW.height };
  },
);

function clamp(next: { x: number; y: number; width: number; height: number }): void {
  const width = Math.max(VIEW.width / ZOOM_MAX, Math.min(VIEW.width, next.width));
  const height = (width / VIEW.width) * VIEW.height;
  const x = Math.max(VIEW.x, Math.min(VIEW.x + VIEW.width - width, next.x));
  const y = Math.max(VIEW.y, Math.min(VIEW.y + VIEW.height - height, next.y));
  view.value = { x, y, width, height };
}

function zoom(factor: number, fx = 0.5, fy = 0.5): void {
  const { x, y, width, height } = view.value;
  const w = width / factor;
  const h = height / factor;
  clamp({ x: x + (width - w) * fx, y: y + (height - h) * fy, width: w, height: h });
}

function reset(): void {
  view.value = { x: VIEW.x, y: VIEW.y, width: VIEW.width, height: VIEW.height };
}

const svg = ref<SVGSVGElement | null>(null);

function onWheel(event: WheelEvent): void {
  const box = svg.value?.getBoundingClientRect();
  if (box === undefined || box.width === 0) return;
  zoom(event.deltaY < 0 ? 1.25 : 0.8, (event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
}

let drag: { x: number; y: number; view: typeof view.value } | undefined;

function onPointerDown(event: PointerEvent): void {
  drag = { x: event.clientX, y: event.clientY, view: { ...view.value } };
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const box = svg.value?.getBoundingClientRect();
  if (drag === undefined || box === undefined || box.width === 0) return;
  const scale = drag.view.width / box.width;
  clamp({
    x: drag.view.x - (event.clientX - drag.x) * scale,
    y: drag.view.y - (event.clientY - drag.y) * scale,
    width: drag.view.width,
    height: drag.view.height,
  });
}

function onPointerUp(): void {
  drag = undefined;
}

function onKeydown(event: KeyboardEvent): void {
  const step = view.value.width / 10;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[event.key];
  if (move !== undefined) {
    event.preventDefault();
    clamp({ ...view.value, x: view.value.x + move[0], y: view.value.y + move[1] });
  } else if (event.key === "+" || event.key === "=") zoom(1.4);
  else if (event.key === "-") zoom(1 / 1.4);
}

const areaMarks = computed(() =>
  props.marks.filter((mark) => elementById(mark.id).geometry.type === "area" && AREA_PATHS.has(mark.id)),
);
const pointMarks = computed(() => props.marks.filter((mark) => elementById(mark.id).geometry.type === "point"));
const plainAreas = computed(() => [...AREA_PATHS.entries()]);

const lineEnds = computed(() => {
  if (props.line === undefined) return undefined;
  const a = centreOf(elementById(props.line.from));
  const b = centreOf(elementById(props.line.to));
  return { a, b, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
});
</script>

<template>
  <div class="map-box">
    <svg
      ref="svg"
      class="map"
      :viewBox="viewBox"
      role="img"
      tabindex="0"
      :aria-label="`${label} ${t('mapKeys')}`"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <rect :x="VIEW.x" :y="VIEW.y" :width="VIEW.width" :height="VIEW.height" class="sea" />
      <path :d="CONTEXT_PATH" class="context" fill-rule="evenodd" />
      <path v-for="[id, d] in plainAreas" :key="id" :d="d" class="land" fill-rule="evenodd" />
      <path
        v-for="mark in areaMarks"
        :key="`${mark.role}-${mark.id}`"
        :d="AREA_PATHS.get(mark.id)"
        :class="['mark', mark.role]"
        fill-rule="evenodd"
      />
      <g v-if="lineEnds !== undefined && line !== undefined">
        <line
          :x1="lineEnds.a.x"
          :y1="lineEnds.a.y"
          :x2="lineEnds.b.x"
          :y2="lineEnds.b.y"
          class="distance"
          :stroke-dasharray="`${unit * 8} ${unit * 6}`"
        />
        <text
          :x="lineEnds.mid.x"
          :y="lineEnds.mid.y - unit * 8"
          :font-size="unit * 15"
          text-anchor="middle"
          class="distance-label"
        >
          {{ line.label }}
        </text>
      </g>
      <g v-for="mark in pointMarks" :key="`${mark.role}-${mark.id}`">
        <circle
          :cx="centreOf(elementById(mark.id)).x"
          :cy="centreOf(elementById(mark.id)).y"
          :r="unit * 10"
          :class="['mark', mark.role]"
        />
        <circle
          :cx="centreOf(elementById(mark.id)).x"
          :cy="centreOf(elementById(mark.id)).y"
          :r="unit * 3"
          class="pin"
        />
      </g>
    </svg>
    <div class="zoom">
      <button type="button" :aria-label="t('zoomIn')" @click="zoom(1.4)">+</button>
      <button type="button" :aria-label="t('zoomOut')" @click="zoom(1 / 1.4)">−</button>
      <button type="button" :aria-label="t('zoomReset')" @click="reset">⌂</button>
    </div>
  </div>
</template>

<style scoped>
.map-box {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.map {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
  border-radius: 0.5rem;
}

.map:focus-visible {
  outline: 3px solid var(--geo-focus);
  outline-offset: 2px;
}

.sea {
  fill: var(--geo-sea);
}

.context {
  fill: var(--geo-context);
  stroke: var(--geo-border);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.land {
  fill: var(--geo-land);
  stroke: var(--geo-border);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.mark {
  stroke: var(--geo-ink);
  stroke-width: 2.5px;
  vector-effect: non-scaling-stroke;
}

.mark.asked {
  fill: var(--geo-asked);
}

.mark.right {
  fill: var(--geo-right);
}

.mark.chosen {
  fill: var(--geo-chosen);
  fill-opacity: 0.85;
  stroke-dasharray: 6 4;
}

.pin {
  fill: var(--geo-ink);
}

.distance {
  stroke: var(--geo-ink);
  stroke-width: 2.5px;
  vector-effect: non-scaling-stroke;
}

.distance-label {
  fill: var(--geo-ink);
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--geo-sea);
  stroke-width: 4px;
  stroke-linejoin: round;
}

.zoom {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.zoom button {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.5rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}
</style>
