// The shapes as SVG paths: the geometry of src/data/geo projected onto the map plane (core/geo.ts), computed once.
import { CONTEXT, ELEMENTS, type Element } from "../core/data.ts";
import { project, type Polygon, type Position } from "../core/geo.ts";

const fixed = (n: number): string => (Math.round(n * 10) / 10).toString();

function pathOf(polygons: readonly Polygon[]): string {
  return polygons
    .flatMap((polygon) => polygon)
    .map((ring) =>
      ring
        .map((position, i) => {
          const p = project(position[0], position[1]);
          return `${i === 0 ? "M" : "L"}${fixed(p.x)} ${fixed(p.y)}`;
        })
        .join(""),
    )
    .map((d) => `${d}Z`)
    .join("");
}

function linePathOf(lines: readonly (readonly Position[])[]): string {
  return lines
    .map((line) =>
      line
        .map((position, i) => {
          const p = project(position[0], position[1]);
          return `${i === 0 ? "M" : "L"}${fixed(p.x)} ${fixed(p.y)}`;
        })
        .join(""),
    )
    .join("");
}

/** The paths of all lines (rivers), by element id. */
export const LINE_PATHS: ReadonlyMap<string, string> = new Map(
  ELEMENTS.flatMap((element): [string, string][] =>
    element.geometry.type === "line" ? [[element.id, linePathOf(element.geometry.lines)]] : [],
  ),
);

/** The path of the grey land around the countries of the list. */
export const CONTEXT_PATH: string = pathOf(CONTEXT);

/** The paths of all areas, by element id. */
export const AREA_PATHS: ReadonlyMap<string, string> = new Map(
  ELEMENTS.flatMap((element): [string, string][] =>
    element.geometry.type === "area" ? [[element.id, pathOf(element.geometry.polygons)]] : [],
  ),
);

/** Where a position lies on the map plane. */
export function planeOf(position: Position): { x: number; y: number } {
  return project(position[0], position[1]);
}

/** Where an element lies on the map plane: its point or the middle of its area. */
export function centreOf(element: Element): { x: number; y: number } {
  return planeOf(element.centre);
}

/** The larger side of the box around each area on the map plane, in kilometres: small shapes get a ring on the map. */
export const AREA_SIZE: ReadonlyMap<string, number> = new Map(
  ELEMENTS.flatMap((element): [string, number][] => {
    if (element.geometry.type !== "area") return [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (const polygon of element.geometry.polygons) {
      for (const position of polygon[0] ?? []) {
        const p = project(position[0], position[1]);
        xs.push(p.x);
        ys.push(p.y);
      }
    }
    return xs.length === 0
      ? []
      : [[element.id, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))]];
  }),
);
