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

/** The countries with the place of their name and the width of their largest part on the map plane, in kilometres. */
export const COUNTRY_LABELS: readonly { id: string; x: number; y: number; width: number }[] = ELEMENTS.flatMap(
  (element) => {
    if (element.kind !== "land" || element.geometry.type !== "area") return [];
    let width = 0;
    for (const polygon of element.geometry.polygons) {
      const xs = (polygon[0] ?? []).map((position) => project(position[0], position[1]).x);
      width = Math.max(width, Math.max(...xs) - Math.min(...xs));
    }
    return [{ id: element.id, ...planeOf(element.centre), width }];
  },
);
