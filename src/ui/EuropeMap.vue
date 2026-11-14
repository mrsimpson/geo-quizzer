<script setup lang="ts">
// The map of Europe as SVG: grey land around, the countries, capitals as circles. Elements can be marked (orange: asked
// for, green: the right one, blue: the learner's choice); a dashed line with the distance joins two elements. The
// learner can zoom (buttons, wheel) and move the map (drag, arrow keys when the map has the focus).
import { computed, ref, watch } from "vue";
import { translator } from "@lernapps/tooling/i18n";
import { elementById } from "../core/data.ts";
import { EXTENT, project, VIEW } from "../core/geo.ts";
import de from "../messages/de.json";
import { AREA_PATHS, CONTEXT_PATH, LINE_PATHS, centreOf } from "./paths.ts";

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
/** One screen pixel in map units, roughly: circles keep their size when the map is zoomed. */
const unit = computed(() => view.value.width / 700);

watch(
  () => props.resetKey,
  () => {
    view.value = { x: VIEW.x, y: VIEW.y, width: VIEW.width, height: VIEW.height };
    if (props.marks.some((mark) => mark.role === "asked")) showMiddleOf(props.marks.map((mark) => mark.id));
  },
);

function clamp(next: { x: number; y: number; width: number; height: number }): void {
  const width = Math.max(VIEW.width / ZOOM_MAX, Math.min(VIEW.width, next.width));
  const height = (width / VIEW.width) * VIEW.height;
  const x = Math.max(EXTENT.x, Math.min(EXTENT.x + EXTENT.width - width, next.x));
  const y = Math.max(EXTENT.y, Math.min(EXTENT.y + EXTENT.height - height, next.y));
  view.value = { x, y, width, height };
}

/** The part of the map plane the given elements cover. */
function boundsOf(ids: readonly string[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const add = (lon: number, lat: number): void => {
    const p = project(lon, lat);
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  };
  for (const id of ids) {
    const geometry = elementById(id).geometry;
    if (geometry.type === "point") add(geometry.point[0], geometry.point[1]);
    else if (geometry.type === "line")
      for (const line of geometry.lines) for (const point of line) add(point[0], point[1]);
    else for (const polygon of geometry.polygons) for (const point of polygon[0] ?? []) add(point[0], point[1]);
  }
  return bounds;
}

/** Shows the given elements with room around them: after an answer, the learner sees where the two lie. */
function fitTo(ids: readonly string[]): void {
  const b = boundsOf(ids);
  const ratio = VIEW.height / VIEW.width;
  const width = Math.max((b.maxX - b.minX) * 1.8, ((b.maxY - b.minY) * 1.8) / ratio, VIEW.width / 6);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  clamp({ x: cx - width / 2, y: cy - (width * ratio) / 2, width, height: width * ratio });
}

/** Moves the map, without zooming, so that the middle of the given elements is in view (the Ural lies beyond the first view). */
function showMiddleOf(ids: readonly string[]): void {
  const b = boundsOf(ids);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const { x, y, width, height } = view.value;
  const margin = 0.1;
  if (
    cx > x + width * margin &&
    cx < x + width * (1 - margin) &&
    cy > y + height * margin &&
    cy < y + height * (1 - margin)
  ) {
    return;
  }
  clamp({ x: cx - width / 2, y: cy - height / 2, width, height });
}

watch(
  () => props.marks.map((mark) => `${mark.role}:${mark.id}`).join(),
  () => {
    if (props.marks.some((mark) => mark.role === "right")) fitTo(props.marks.map((mark) => mark.id));
    else if (props.marks.some((mark) => mark.role === "asked")) showMiddleOf(props.marks.map((mark) => mark.id));
  },
);

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
const lineMarks = computed(() => props.marks.filter((mark) => LINE_PATHS.has(mark.id)));
const riverPaths = [...LINE_PATHS.entries()];
const pointMarks = computed(() => props.marks.filter((mark) => elementById(mark.id).geometry.type === "point"));
const countryPaths = [...AREA_PATHS.entries()].filter(([id]) => elementById(id).kind === "land");
const lakePaths = [...AREA_PATHS.entries()].filter(([id]) => elementById(id).kind === "see");

const lineEnds = computed(() => {
  if (props.line === undefined) return undefined;
  return { a: centreOf(elementById(props.line.from)), b: centreOf(elementById(props.line.to)) };
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
      <rect :x="EXTENT.x" :y="EXTENT.y" :width="EXTENT.width" :height="EXTENT.height" class="sea" />
      <path :d="CONTEXT_PATH" class="context" fill-rule="evenodd" />
      <path v-for="[id, d] in countryPaths" :key="id" :d="d" class="land" fill-rule="evenodd" />
      <path v-for="[id, d] in lakePaths" :key="id" :d="d" class="lake" fill-rule="evenodd" />
      <path v-for="[id, d] in riverPaths" :key="id" :d="d" class="river" />
      <path
        v-for="mark in areaMarks"
        :key="`${mark.role}-${mark.id}`"
        :d="AREA_PATHS.get(mark.id)"
        :class="['mark', 'region', mark.role, elementById(mark.id).kind]"
        fill-rule="evenodd"
      />
      <path
        v-for="mark in lineMarks"
        :key="`${mark.role}-${mark.id}`"
        :d="LINE_PATHS.get(mark.id)"
        :class="['line-mark', mark.role]"
      />
      <g v-if="lineEnds !== undefined && line !== undefined">
        <line :x1="lineEnds.a.x" :y1="lineEnds.a.y" :x2="lineEnds.b.x" :y2="lineEnds.b.y" class="distance" />
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
    <p v-if="line !== undefined" class="distance-box">{{ t("distanceLabel", { label: line.label }) }}</p>
    <div class="zoom">
      <button type="button" :aria-label="t('zoomIn')" @click="zoom(1.4)">+</button>
      <button type="button" :aria-label="t('zoomOut')" @click="zoom(1 / 1.4)">−</button>
      <button type="button" class="zoom-reset" :aria-label="t('zoomReset')" @click="reset">
        {{ t("zoomResetShort") }}
      </button>
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

.lake {
  fill: var(--geo-sea);
  stroke: var(--geo-border);
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.river {
  fill: none;
  stroke: var(--geo-river);
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
}

.region:not(.land) {
  fill-opacity: 0.65;
}

.line-mark {
  fill: none;
  stroke-width: 5px;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.line-mark.asked {
  stroke: var(--geo-asked);
}

.line-mark.right {
  stroke: var(--geo-right);
}

.line-mark.chosen {
  stroke: var(--geo-chosen);
  stroke-dasharray: 6 4;
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
  stroke-width: 3px;
  stroke-dasharray: 8 6;
  vector-effect: non-scaling-stroke;
}

.distance-box {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  margin: 0;
  padding: 0.25rem 0.625rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.5rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-weight: 700;
}

.zoom {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.zoom button {
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.5rem;
  border: 2px solid var(--geo-ink);
  border-radius: 0.5rem;
  background: var(--geo-button);
  color: var(--geo-ink);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}
</style>
