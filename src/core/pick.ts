// Pointing at the map: whether a point is a hit for an element, and how far it is from it.
import type { Element, Kind } from "./data.ts";
import { distanceKm, nearestOnArea, nearestOnLines, type Position } from "./geo.ts";

/** How far from the element a point may be and still count: the places of cities, rivers and lakes are small. */
const RADIUS_KM: Readonly<Record<Kind, number>> = {
  land: 10,
  stadt: 80,
  fluss: 50,
  gebirge: 10,
  see: 40,
  meer: 0,
  raum: 0,
};

export interface Pick {
  readonly right: boolean;
  /** Kilometres from the point to the nearest point of the element, rounded to 10; 0 inside an area. */
  readonly km: number;
  /** The nearest point of the element. */
  readonly nearest: Position;
}

export function evaluatePick(element: Element, point: Position): Pick {
  const found =
    element.geometry.type === "point"
      ? { at: element.geometry.point, km: distanceKm(point, element.geometry.point) }
      : element.geometry.type === "line"
        ? nearestOnLines(point, element.geometry.lines)
        : nearestOnArea(point, element.geometry.polygons);
  return { right: found.km <= RADIUS_KM[element.kind], km: Math.round(found.km / 10) * 10, nearest: found.at };
}
