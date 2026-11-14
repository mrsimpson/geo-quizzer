// The content as the core sees it: the elements of src/data/elements with their geometry from src/data/geo and the
// relations between them. A new element is a record in a data file, never code.
import laender from "../data/elements/laender.json" with { type: "json" };
import hauptstaedte from "../data/elements/hauptstaedte.json" with { type: "json" };
import relationData from "../data/relations.json" with { type: "json" };
import laenderGeo from "../data/geo/laender.json" with { type: "json" };
import hauptstaedteGeo from "../data/geo/hauptstaedte.json" with { type: "json" };
import kontextGeo from "../data/geo/kontext.json" with { type: "json" };
import { centroid, type Polygon, type Position } from "./geo.ts";

/** The kinds of elements, in the order the topics are shown. */
export const KINDS = ["land", "stadt"] as const;
export type Kind = (typeof KINDS)[number];

export type Geometry =
  | { readonly type: "area"; readonly polygons: readonly Polygon[] }
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

const geometries = { ...laenderGeo, ...hauptstaedteGeo } as unknown as { [id: string]: Geometry };

function elementsOf(records: readonly Entry[]): Element[] {
  return records.map((record) => {
    const geometry = geometries[record.id];
    if (geometry === undefined) throw new Error(`no geometry for ${record.id}`);
    return {
      id: record.id,
      kind: record.kind as Kind,
      level: record.level,
      geometry,
      centre: geometry.type === "point" ? geometry.point : centroid(geometry.polygons),
    };
  });
}

/** All elements, countries first. */
export const ELEMENTS: readonly Element[] = [...elementsOf(laender), ...elementsOf(hauptstaedte)];

const byId = new Map(ELEMENTS.map((element) => [element.id, element]));

export function elementById(id: string): Element {
  const element = byId.get(id);
  if (element === undefined) throw new Error(`unknown element ${id}`);
  return element;
}

export const RELATIONS: readonly Relation[] = relationData;

/** The grey land around the countries of the list: no element, only the picture. */
export const CONTEXT: readonly Polygon[] = (kontextGeo as unknown as { polygons: Polygon[] }).polygons;
