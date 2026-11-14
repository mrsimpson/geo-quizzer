// The content as the core sees it: the elements of src/data/elements with their geometry from src/data/geo and the
// relations between them. A new element is a record in a data file, never code.
import laender from "../data/elements/laender.json" with { type: "json" };
import hauptstaedte from "../data/elements/hauptstaedte.json" with { type: "json" };
import fluesse from "../data/elements/fluesse.json" with { type: "json" };
import gebirge from "../data/elements/gebirge.json" with { type: "json" };
import seen from "../data/elements/seen.json" with { type: "json" };
import meere from "../data/elements/meere.json" with { type: "json" };
import teilraeume from "../data/elements/teilraeume.json" with { type: "json" };
import relationData from "../data/relations.json" with { type: "json" };
import relationGeoData from "../data/geo/relations-geo.json" with { type: "json" };
import fluesseGeo from "../data/geo/fluesse.json" with { type: "json" };
import gebirgeGeo from "../data/geo/gebirge.json" with { type: "json" };
import seenGeo from "../data/geo/seen.json" with { type: "json" };
import meereGeo from "../data/geo/meere.json" with { type: "json" };
import teilraeumeGeo from "../data/geo/teilraeume.json" with { type: "json" };
import laenderGeo from "../data/geo/laender.json" with { type: "json" };
import hauptstaedteGeo from "../data/geo/hauptstaedte.json" with { type: "json" };
import kontextGeo from "../data/geo/kontext.json" with { type: "json" };
import { centroid, type Polygon, type Position, type Ring } from "./geo.ts";

/** The kinds of elements, in the order the topics are shown. */
export const KINDS = ["land", "stadt", "fluss", "gebirge", "see", "meer", "raum"] as const;
export type Kind = (typeof KINDS)[number];

export type Geometry =
  | { readonly type: "area"; readonly polygons: readonly Polygon[] }
  | { readonly type: "line"; readonly lines: readonly Ring[] }
  | { readonly type: "point"; readonly point: Position };

/** One thing to learn: a country, a capital, ... */
export interface Element {
  readonly id: string;
  readonly kind: Kind;
  /** The first level (Stufe 1 to 4) in which it appears. */
  readonly level: number;
  readonly geometry: Geometry;
  /** Where the middle of the element is: the point of a point, the centroid of an area. */
  readonly centre: Position;
}

export interface Relation {
  readonly type: string;
  readonly from: string;
  readonly to: string;
}

interface Entry {
  id: string;
  kind: string;
  level: number;
}

const geometries = {
  ...laenderGeo,
  ...hauptstaedteGeo,
  ...fluesseGeo,
  ...gebirgeGeo,
  ...seenGeo,
  ...meereGeo,
  ...teilraeumeGeo,
} as unknown as { [id: string]: Geometry };

/** The middle of a line: the middle vertex of its longest part. */
function lineCentre(lines: readonly Ring[]): Position {
  let best: Ring = [];
  for (const line of lines) if (line.length > best.length) best = line;
  return best[Math.floor(best.length / 2)] ?? [0, 0];
}

function elementsOf(records: readonly Entry[]): Element[] {
  return records.map((record) => {
    const geometry = geometries[record.id];
    if (geometry === undefined) throw new Error(`no geometry for ${record.id}`);
    return {
      id: record.id,
      kind: record.kind as Kind,
      level: record.level,
      geometry,
      centre:
        geometry.type === "point"
          ? geometry.point
          : geometry.type === "line"
            ? lineCentre(geometry.lines)
            : centroid(geometry.polygons),
    };
  });
}

/** All elements, countries first. */
export const ELEMENTS: readonly Element[] = [
  ...elementsOf(laender),
  ...elementsOf(hauptstaedte),
  ...elementsOf(fluesse),
  ...elementsOf(gebirge),
  ...elementsOf(seen),
  ...elementsOf(meere),
  ...elementsOf(teilraeume),
];

const byId = new Map(ELEMENTS.map((element) => [element.id, element]));

export function elementById(id: string): Element {
  const element = byId.get(id);
  if (element === undefined) throw new Error(`unknown element ${id}`);
  return element;
}

/** The relations by hand (relations.json) and from the shapes (geo/relations-geo.json), each once. */
export const RELATIONS: readonly Relation[] = (() => {
  const seen = new Set<string>();
  return [...relationData, ...relationGeoData].filter((r) => {
    const key = r.type === "grenzt-an" ? [r.type, ...[r.from, r.to].sort()].join("|") : `${r.type}|${r.from}|${r.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

/** The grey land around the countries of the list: no element, only the picture. */
export const CONTEXT: readonly Polygon[] = (kontextGeo as unknown as { polygons: Polygon[] }).polygons;
