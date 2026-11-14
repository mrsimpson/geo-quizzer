<script setup lang="ts">
// The map of Europe as SVG: grey land around, the countries, rivers and lakes. Elements can be marked (orange: asked
// for, green: the right one, blue: the learner's choice); a dashed line with the distance joins two places. The detail
// depends on the level: borders (1, 2), borders with names (3), only the coast (4). The learner can zoom (buttons,
// wheel) and move the map (drag). Where the map is pickable (3, 4), a click or tap puts the pin, the arrow keys move a
// crosshair (Shift and the arrows move the map), and the parent asks for "Hier setzen".
import { computed, ref, watch } from "vue";
import { translator } from "@lernapps/tooling/i18n";
import { ELEMENTS, elementById } from "../core/data.ts";
import { EXTENT, project, unproject, VIEW, type Position } from "../core/geo.ts";
import de from "../messages/de.json";
import { AREA_PATHS, CONTEXT_PATH, COUNTRY_LABELS, LINE_PATHS, centreOf, planeOf } from "./paths.ts";

export interface Mark {
  id: string;
  role: "asked" | "right" | "chosen";
}

const props = defineProps<{
  /** The elements marked, and how. */
  marks: readonly Mark[];
  /** Two places a dashed line joins, with its label. */
  line?: { from: Position; to: Position; label: string } | undefined;
  /** How much the map shows: borders, borders with names, or only the coast. */
  detail: "borders" | "names" | "coast";
  /** Whether a click or tap puts the pin. */
  pickable: boolean;
  /** Where the learner's pin is. */
  pin: Position | null;
  /** The text for screen readers: what is asked, without the answer. */
  label: string;
  /** Changes with every task: the map shows everything again. */
  resetKey: number;
}>();

const emit = defineEmits<{ pick: [point: Position] }>();
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
function fitTo(ids: readonly string[], extra: readonly Position[] = []): void {
  const b = boundsOf(ids);
  for (const position of extra) {
    const p = project(position[0], position[1]);
    b.minX = Math.min(b.minX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxX = Math.max(b.maxX, p.x);
    b.maxY = Math.max(b.maxY, p.y);
  }
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
  () => `${props.marks.map((mark) => `${mark.role}:${mark.id}`).join()}|${props.line?.label ?? ""}`,
  () => {
    if (props.marks.some((mark) => mark.role === "right")) {
      const extra = props.line === undefined ? [] : [props.line.from, props.line.to];
      fitTo(
        props.marks.map((mark) => mark.id),
        extra,
      );
    } else if (props.marks.some((mark) => mark.role === "asked")) showMiddleOf(props.marks.map((mark) => mark.id));
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

let drag: { x: number; y: number; view: typeof view.value; moved: boolean } | undefined;

function onPointerDown(event: PointerEvent): void {
  drag = { x: event.clientX, y: event.clientY, view: { ...view.value }, moved: false };
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const box = svg.value?.getBoundingClientRect();
  if (drag === undefined || box === undefined || box.width === 0) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
  if (!drag.moved) return;
  const scale = drag.view.width / box.width;
  clamp({
    x: drag.view.x - (event.clientX - drag.x) * scale,
    y: drag.view.y - (event.clientY - drag.y) * scale,
    width: drag.view.width,
    height: drag.view.height,
  });
}

/** The point of the map plane under a click. */
function planeAt(event: PointerEvent): { x: number; y: number } | undefined {
  const box = svg.value?.getBoundingClientRect();
  if (box === undefined || box.width === 0 || box.height === 0) return undefined;
  const { x, y, width, height } = view.value;
  // the SVG is shown in full inside its box ("meet"): the scale and the offset follow from the smaller ratio
  const scale = Math.max(width / box.width, height / box.height);
  const offsetX = (box.width - width / scale) / 2;
  const offsetY = (box.height - height / scale) / 2;
  return { x: x + (event.clientX - box.left - offsetX) * scale, y: y + (event.clientY - box.top - offsetY) * scale };
}

function onPointerUp(event: PointerEvent): void {
  const was = drag;
  drag = undefined;
  if (was === undefined || was.moved || !props.pickable) return;
  const plane = planeAt(event);
  if (plane !== undefined) emit("pick", unproject(plane));
}

/** The crosshair of the keyboard, on the map plane; it appears with the first arrow key. */
const crosshair = ref<{ x: number; y: number } | null>(null);

watch(
  () => props.resetKey,
  () => {
    crosshair.value = null;
  },
);

function onKeydown(event: KeyboardEvent): void {
  const step = view.value.width / (props.pickable && !event.shiftKey ? 40 : 10);
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[event.key];
  if (move !== undefined) {
    event.preventDefault();
    if (props.pickable && !event.shiftKey) {
      const { x, y, width, height } = view.value;
      const from = crosshair.value ?? { x: x + width / 2, y: y + height / 2 };
      const to = { x: from.x + move[0], y: from.y + move[1] };
      crosshair.value = to;
      // keep the crosshair in view
      if (to.x < x || to.x > x + width || to.y < y || to.y > y + height) {
        clamp({ x: to.x - width / 2, y: to.y - height / 2, width, height });
      }
      emit("pick", unproject(to));
    } else clamp({ ...view.value, x: view.value.x + move[0], y: view.value.y + move[1] });
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
  return { a: planeOf(props.line.from), b: planeOf(props.line.to) };
});

const pinAt = computed(() => (props.pin === null ? undefined : planeOf(props.pin)));
const cityDots = ELEMENTS.filter((e) => e.kind === "stadt").map((e) => ({ id: e.id, ...planeOf(e.centre) }));

/** The names of the countries that fit at the current zoom: a name needs about 6.5 pixels a letter. */
const labels = computed(() =>
  props.detail !== "names"
    ? []
    : COUNTRY_LABELS.filter((l) => l.width / unit.value >= t(`el.${l.id}.name`).length * 6.5),
);
</script>

<template>
  <div class="map-box">
    <svg
      ref="svg"
      :class="['map', detail, { pickable }]"
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
      <circle
        v-for="city in detail === 'names' ? cityDots : []"
        :key="city.id"
        :cx="city.x"
        :cy="city.y"
        :r="unit * 3"
        class="city-dot"
      />
      <text
        v-for="l in labels"
        :key="l.id"
        :x="l.x"
        :y="l.y"
        :font-size="unit * 11"
        text-anchor="middle"
        class="country-name"
      >
        {{ t(`el.${l.id}.name`) }}
      </text>
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
      <g v-if="pinAt !== undefined">
        <circle :cx="pinAt.x" :cy="pinAt.y" :r="unit * 9" class="pin-ring" />
        <circle :cx="pinAt.x" :cy="pinAt.y" :r="unit * 3" class="pin-dot" />
      </g>
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
      <g v-if="crosshair !== null && pickable" class="crosshair">
        <line :x1="crosshair.x - unit * 14" :y1="crosshair.y" :x2="crosshair.x + unit * 14" :y2="crosshair.y" />
        <line :x1="crosshair.x" :y1="crosshair.y - unit * 14" :x2="crosshair.x" :y2="crosshair.y + unit * 14" />
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

.map.pickable {
  cursor: crosshair;
}

.sea {
  fill: var(--geo-sea);
}

.coast .land {
  stroke: var(--geo-land);
}

.coast .river,
.coast .lake {
  display: none;
}

.city-dot {
  fill: var(--geo-border);
}

.country-name {
  fill: var(--geo-ink);
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--geo-land);
  stroke-width: 3px;
  stroke-linejoin: round;
  pointer-events: none;
}

.pin-ring {
  fill: none;
  stroke: var(--geo-chosen);
  stroke-width: 3px;
  vector-effect: non-scaling-stroke;
}

.pin-dot {
  fill: var(--geo-chosen);
}

.crosshair line {
  stroke: var(--geo-ink);
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
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

@media (max-height: 480px) {
  .zoom button {
    min-width: 2rem;
    height: 2rem;
    font-size: 1rem;
  }

  .distance-box {
    padding: 0.125rem 0.5rem;
    font-size: 0.875rem;
  }
}
</style>
