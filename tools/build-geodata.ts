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

async function countries(): Promise<void> {
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

await countries();
await capitals();
