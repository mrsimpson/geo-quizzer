// Builds src/data/geo/*.json from Natural Earth (public domain, https://www.naturalearthdata.com/about/terms-of-use/).
// Run: npm run geodata. Reads the zip files in tools/cache (downloaded from Natural Earth, not committed), cuts them to
// the map frame of Europe, simplifies them and writes one file per kind of element.
// The element records in src/data/elements/*.json name their Natural Earth source in the field `ne`.
/// <reference types="node" />
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import polygonClipping from "polygon-clipping";
import * as shapefile from "shapefile";

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];

interface Element {
  id: string;
  kind: string;
  level: number;
  ne: string;
}

interface Feature {
  properties: Record<string, string | number | null>;
  geometry: { type: string; coordinates: unknown } | null;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "tools", "cache");
const out = join(root, "src", "data", "geo");

/** The map frame: longitude west, south, east, north in degrees. Must agree with src/core/geo.ts (FRAME). */
const FRAME = { west: -25, south: 34, east: 68, north: 71.5 };
/** Simplification in degrees: about 2 km. */
const EPSILON = 0.03;
/** Rings smaller than this (square degrees) are dropped unless they are the largest of their element. */
const MIN_AREA = 0.02;

async function readLayer(name: string): Promise<Feature[]> {
  const file = join(cache, `${name}.zip`);
  if (!existsSync(file)) {
    throw new Error(
      `${file} is missing: download ${name}.zip from the Natural Earth download page (naturalearthdata.com, ` +
        `Downloads) and put it into tools/cache`,
    );
  }
  const files = unzipSync(new Uint8Array(readFileSync(file)));
  const shp = Object.keys(files).find((key) => key.endsWith(".shp"));
  const dbf = Object.keys(files).find((key) => key.endsWith(".dbf"));
  const shpData = shp === undefined ? undefined : files[shp];
  const dbfData = dbf === undefined ? undefined : files[dbf];
  if (shpData === undefined || dbfData === undefined) throw new Error(`${name}: no .shp or .dbf in the zip file`);
  const source = await shapefile.open(shpData, dbfData, { encoding: "utf-8" });
  const features: Feature[] = [];
  for (;;) {
    const result = await source.read();
    if (result.done) break;
    const feature = result.value;
    // The dbf pads text fields with NUL characters.
    for (const key of Object.keys(feature.properties)) {
      const value = feature.properties[key];
      if (typeof value === "string") feature.properties[key] = value.replace(/\0+$/g, "").trim();
    }
    if (feature.geometry !== null) features.push(feature);
  }
  return features;
}

function polygonsOf(geometry: { type: string; coordinates: unknown }): Polygon[] {
  if (geometry.type === "Polygon") return [geometry.coordinates as Polygon];
  if (geometry.type === "MultiPolygon") return geometry.coordinates as Polygon[];
  return [];
}

const frameRing: Ring = [
  [FRAME.west, FRAME.south],
  [FRAME.east, FRAME.south],
  [FRAME.east, FRAME.north],
  [FRAME.west, FRAME.north],
  [FRAME.west, FRAME.south],
];

function clipToFrame(polygons: Polygon[]): Polygon[] {
  if (polygons.length === 0) return [];
  const result = polygonClipping.intersection(polygons, [frameRing]);
  return result as Polygon[];
}

function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (a !== undefined && b !== undefined) sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/** Douglas-Peucker on an open polyline. */
function simplifyLine(points: Position[], epsilon: number): Position[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return points;
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (p === undefined) continue;
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    const length = dx * dx + dy * dy;
    let distance: number;
    if (length === 0) distance = Math.hypot(p[0] - first[0], p[1] - first[1]);
    else {
      const t = Math.max(0, Math.min(1, ((p[0] - first[0]) * dx + (p[1] - first[1]) * dy) / length));
      distance = Math.hypot(p[0] - (first[0] + t * dx), p[1] - (first[1] + t * dy));
    }
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  if (max <= epsilon) return [first, last];
  const left = simplifyLine(points.slice(0, index + 1), epsilon);
  const right = simplifyLine(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

function round(point: Position): Position {
  return [Math.round(point[0] * 100) / 100, Math.round(point[1] * 100) / 100];
}

function simplifyRing(ring: Ring, epsilon: number): Ring | undefined {
  const open = ring.slice(0, -1);
  const simple = simplifyLine([...open, open[0] as Position], epsilon);
  const closed = simple.map(round);
  const unique = closed.filter((p, i) => i === 0 || p[0] !== closed[i - 1]?.[0] || p[1] !== closed[i - 1]?.[1]);
  return unique.length >= 4 ? unique : undefined;
}

function simplifyPolygons(polygons: Polygon[], epsilon: number, minArea: number): Polygon[] {
  const largest = Math.max(0, ...polygons.map((polygon) => ringArea(polygon[0] ?? [])));
  const result: Polygon[] = [];
  for (const polygon of polygons) {
    const outer = polygon[0];
    if (outer === undefined) continue;
    const area = ringArea(outer);
    if (area < minArea && area !== largest) continue;
    const rings: Polygon = [];
    for (const [i, ring] of polygon.entries()) {
      if (i > 0 && ringArea(ring) < minArea) continue;
      const simple = simplifyRing(ring, epsilon);
      if (simple !== undefined) rings.push(simple);
    }
    if (rings.length > 0) result.push(rings);
  }
  return result;
}

function readElements(file: string): Element[] {
  return JSON.parse(readFileSync(join(root, "src", "data", "elements", file), "utf-8")) as Element[];
}

function write(name: string, value: unknown): void {
  mkdirSync(out, { recursive: true });
  const text = JSON.stringify(value);
  writeFileSync(join(out, name), text + "\n");
  console.log(`${name}: ${(text.length / 1024).toFixed(0)} kB`);
}

/** Small territories that belong to a country of the list (Natural Earth lists them on their own). */
const PARTS: Record<string, string> = {
  Åland: "Finland",
  "Faeroe Is.": "Denmark",
  Jersey: "United Kingdom",
  Guernsey: "United Kingdom",
  "Isle of Man": "United Kingdom",
};

async function countries(): Promise<Record<string, { type: "area"; polygons: Polygon[] }>> {
  const elements = readElements("laender.json");
  const features = await readLayer("ne_50m_admin_0_countries");
  const byName = new Map<string, Feature>();
  for (const feature of features) byName.set(String(feature.properties["NAME"]), feature);
  const areas: Record<string, { type: "area"; polygons: Polygon[] }> = {};
  const used = new Set<string>();
  for (const element of elements) {
    const feature = byName.get(element.ne);
    if (feature?.geometry === null || feature === undefined)
      throw new Error(`no Natural Earth country "${element.ne}"`);
    used.add(element.ne);
    let polygons = polygonsOf(feature.geometry);
    for (const [part, parent] of Object.entries(PARTS)) {
      const partFeature = byName.get(part);
      if (parent === element.ne && partFeature?.geometry) {
        used.add(part);
        polygons = [...polygons, ...polygonsOf(partFeature.geometry)];
      }
    }
    const minArea = element.ne === "Malta" || element.ne === "Cyprus" ? 0 : MIN_AREA;
    areas[element.id] = { type: "area", polygons: simplifyPolygons(clipToFrame(polygons), EPSILON, minArea) };
  }
  write("laender.json", areas);
  // The other countries of the frame as a grey background: no element, no task.
  const context: Polygon[] = [];
  for (const feature of features) {
    const name = String(feature.properties["NAME"]);
    if (used.has(name) || feature.geometry === null) continue;
    context.push(...simplifyPolygons(clipToFrame(polygonsOf(feature.geometry)), EPSILON * 2, MIN_AREA * 4));
  }
  write("kontext.json", { type: "area", polygons: context });
  return areas;
}

async function capitals(): Promise<void> {
  const elements = readElements("hauptstaedte.json");
  const features = await readLayer("ne_10m_populated_places_simple");
  const points: Record<string, { type: "point"; point: Position }> = {};
  for (const element of elements) {
    const feature = features.find(
      (f) => f.properties["nameascii"] === element.ne && Number(f.properties["adm0cap"]) === 1,
    );
    const coordinates = feature?.geometry?.coordinates as Position | undefined;
    if (coordinates === undefined) throw new Error(`no Natural Earth capital "${element.ne}"`);
    points[element.id] = { type: "point", point: round(coordinates) };
  }
  write("hauptstaedte.json", points);
}

type Area = { type: "area"; polygons: Polygon[] };
type Line = { type: "line"; lines: Ring[] };

function linesOf(geometry: { type: string; coordinates: unknown }): Ring[] {
  if (geometry.type === "LineString") return [geometry.coordinates as Ring];
  if (geometry.type === "MultiLineString") return geometry.coordinates as Ring[];
  return [];
}

/** The parts of a line inside the frame: points outside cut it. */
function clipLines(lines: Ring[]): Ring[] {
  const inside = (p: Position): boolean =>
    p[0] >= FRAME.west && p[0] <= FRAME.east && p[1] >= FRAME.south && p[1] <= FRAME.north;
  const result: Ring[] = [];
  for (const line of lines) {
    let current: Position[] = [];
    for (const point of line) {
      if (inside(point)) current.push(point);
      else {
        if (current.length > 1) result.push(current);
        current = [];
      }
    }
    if (current.length > 1) result.push(current);
  }
  return result;
}

/** Features of a layer whose property `property` is one of the names (separated by | in the element's field ne). */
function pick(features: Feature[], property: string, names: string): Feature[] {
  const wanted = names.split("|");
  return features.filter((f) => wanted.includes(String(f.properties[property])));
}

/** Rivers: lines. */
async function rivers(): Promise<Record<string, Line>> {
  const features = await readLayer("ne_50m_rivers_lake_centerlines");
  const result: Record<string, Line> = {};
  for (const element of readElements("fluesse.json")) {
    const found = pick(features, "name", element.ne);
    if (found.length === 0) throw new Error(`no Natural Earth river "${element.ne}"`);
    const lines = clipLines(found.flatMap((f) => (f.geometry === null ? [] : linesOf(f.geometry))));
    result[element.id] = {
      type: "line",
      lines: lines.map((line) => simplifyLine([...line], EPSILON).map(round)).filter((line) => line.length > 1),
    };
  }
  write("fluesse.json", result);
  return result;
}

/** Areas from a layer: mountain ranges, lakes, seas. */
async function areasOf(file: string, layer: string, property: string, epsilon: number): Promise<Record<string, Area>> {
  const features = await readLayer(layer);
  const result: Record<string, Area> = {};
  for (const element of readElements(file)) {
    const found = pick(features, property, element.ne);
    if (found.length === 0) throw new Error(`no Natural Earth feature "${element.ne}" in ${layer}`);
    const polygons = found.flatMap((f) => (f.geometry === null ? [] : polygonsOf(f.geometry)));
    result[element.id] = { type: "area", polygons: simplifyPolygons(clipToFrame(polygons), epsilon, 0) };
  }
  return result;
}

interface Relation {
  type: string;
  from: string;
  to: string;
}

/** The sub-regions of Europe: the shapes of their countries, by the relations gehoert-zu in relations.json. */
function regions(countryAreas: Record<string, Area>): Record<string, Area> {
  const relations = JSON.parse(readFileSync(join(root, "src", "data", "relations.json"), "utf-8")) as Relation[];
  const result: Record<string, Area> = {};
  for (const element of readElements("teilraeume.json")) {
    const members = relations.filter((r) => r.type === "gehoert-zu" && r.to === element.id);
    result[element.id] = {
      type: "area",
      polygons: members.flatMap((r) => countryAreas[r.from]?.polygons ?? []),
    };
  }
  return result;
}

// Relations from the shapes: which country a river flows through, in which countries a lake or a range lies, which
// countries share a border. Written to src/data/relations-geo.json, never edited by hand.

function inRing(p: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a === undefined || b === undefined) continue;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function inArea(p: Position, area: Area): boolean {
  return area.polygons.some((polygon) => {
    const [outer, ...holes] = polygon;
    return outer !== undefined && inRing(p, outer) && !holes.some((hole) => inRing(p, hole));
  });
}

function vertices(area: Area): Position[] {
  return area.polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

function denser(line: Ring, step: number): Position[] {
  const result: Position[] = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i] as Position;
    const b = line[i + 1] as Position;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) result.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  const last = line[line.length - 1];
  if (last !== undefined) result.push(last);
  return result;
}

function nearDegrees(a: Position, b: Position): number {
  return Math.hypot((a[0] - b[0]) * Math.cos((a[1] * Math.PI) / 180), a[1] - b[1]);
}

/** Countries that have at least `share` of the sample points (inside them, or within `near` degrees of their shape). */
function countriesOf(points: Position[], countryAreas: Record<string, Area>, share: number, near: number): string[] {
  const found: string[] = [];
  for (const [id, area] of Object.entries(countryAreas)) {
    const vs = near > 0 ? vertices(area) : [];
    let count = 0;
    for (const p of points) {
      if (inArea(p, area) || (near > 0 && vs.some((v) => nearDegrees(p, v) <= near))) count++;
    }
    if (count / points.length >= share) found.push(id);
  }
  return found;
}

/** Pairs of countries whose shapes come within `near` degrees of each other. */
function borders(countryAreas: Record<string, Area>, near: number, not: readonly string[]): [string, string][] {
  const ids = Object.keys(countryAreas);
  const pairs: [string, string][] = [];
  for (const [i, a] of ids.entries()) {
    for (const b of ids.slice(i + 1)) {
      if (not.includes(`${a}|${b}`)) continue;
      const va = vertices(countryAreas[a] as Area);
      const vb = vertices(countryAreas[b] as Area);
      if (va.some((p) => vb.some((q) => nearDegrees(p, q) <= near))) pairs.push([a, b]);
    }
  }
  return pairs;
}

function geoRelations(
  countryAreas: Record<string, Area>,
  riverLines: Record<string, Line>,
  ranges: Record<string, Area>,
  lakes: Record<string, Area>,
): Relation[] {
  const relations: Relation[] = [];
  for (const [id, river] of Object.entries(riverLines)) {
    const points = river.lines.flatMap((line) => denser(line, 0.05));
    for (const country of countriesOf(points, countryAreas, 0.04, 0))
      relations.push({ type: "fliesst-durch", from: id, to: country });
  }
  for (const [id, range] of Object.entries(ranges)) {
    const grid: Position[] = [];
    const vs = vertices(range);
    const xs = vs.map((v) => v[0]);
    const ys = vs.map((v) => v[1]);
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.15) {
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.15) if (inArea([x, y], range)) grid.push([x, y]);
    }
    for (const country of countriesOf(grid, countryAreas, 0.06, 0))
      relations.push({ type: "liegt-in", from: id, to: country });
  }
  for (const [id, lake] of Object.entries(lakes)) {
    const points = lake.polygons.flatMap((polygon) => denser(polygon[0] ?? [], 0.05));
    for (const country of countriesOf(points, countryAreas, 0.15, 0.06))
      relations.push({ type: "liegt-in", from: id, to: country });
  }
  // Borders: straits are no borders (the Oresund is about 4 km wide)
  const straits = ["land-daenemark|land-schweden"];
  for (const [a, b] of borders(countryAreas, 0.04, straits)) relations.push({ type: "grenzt-an", from: a, to: b });
  return relations;
}

const countryAreas = await countries();
await capitals();
const riverLines = await rivers();
const ranges = await areasOf("gebirge.json", "ne_50m_geography_regions_polys", "NAME", 0.05);
write("gebirge.json", ranges);
const lakes = await areasOf("seen.json", "ne_10m_lakes", "name", 0.01);
write("seen.json", lakes);
write("meere.json", await areasOf("meere.json", "ne_50m_geography_marine_polys", "name", 0.1));
write("teilraeume.json", regions(countryAreas));
write("relations-geo.json", geoRelations(countryAreas, riverLines, ranges, lakes));
