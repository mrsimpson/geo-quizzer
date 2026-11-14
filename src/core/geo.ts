// The small GIS of the app: projection of the map of Europe, the inverse for clicks, distances in kilometres and
// the tests whether a point lies in an area. Pure functions on longitude and latitude in degrees.

/** A point: longitude, latitude in degrees. */
export type Position = readonly [number, number];
/** A ring of an area: closed, first point equal to the last. */
export type Ring = readonly Position[];
/** An outer ring followed by the rings of its holes. */
export type Polygon = readonly Ring[];

/** The map frame in degrees. The data in src/data/geo is cut to it (tools/build-geodata.ts, FRAME). */
export const FRAME = { west: -25, south: 33, east: 65, north: 72 } as const;

const EARTH_RADIUS_KM = 6371.0088;
const CENTRE_LON = 20;
const CENTRE_LAT = 53;
const RAD = Math.PI / 180;

/** A point on the map plane: kilometres east and kilometres south of the centre (y grows downwards, as in SVG). */
export interface Plane {
  x: number;
  y: number;
}

/** Lambert azimuthal equal-area projection around the centre of Europe: areas keep their proportions. */
export function project(lon: number, lat: number): Plane {
  const lambda = (lon - CENTRE_LON) * RAD;
  const phi = lat * RAD;
  const phi0 = CENTRE_LAT * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda)));
  return {
    x: EARTH_RADIUS_KM * k * Math.cos(phi) * Math.sin(lambda),
    y: -EARTH_RADIUS_KM * k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda)),
  };
}

/** The inverse of project: the point on the earth below a point of the map plane. */
export function unproject(plane: Plane): Position {
  const x = plane.x;
  const y = -plane.y;
  const rho = Math.hypot(x, y);
  if (rho === 0) return [CENTRE_LON, CENTRE_LAT];
  const c = 2 * Math.asin(Math.min(1, rho / (2 * EARTH_RADIUS_KM)));
  const phi0 = CENTRE_LAT * RAD;
  const phi = Math.asin(Math.cos(c) * Math.sin(phi0) + (y * Math.sin(c) * Math.cos(phi0)) / rho);
  const lambda = Math.atan2(x * Math.sin(c), rho * Math.cos(phi0) * Math.cos(c) - y * Math.sin(phi0) * Math.sin(c));
  return [CENTRE_LON + lambda / RAD, phi / RAD];
}

/** The part of the map plane the frame covers, with a little margin: the view box of the map. */
export const VIEW: { x: number; y: number; width: number; height: number } = (() => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const lon = FRAME.west + ((FRAME.east - FRAME.west) * i) / steps;
    const lat = FRAME.south + ((FRAME.north - FRAME.south) * i) / steps;
    for (const [a, b] of [
      [lon, FRAME.south],
      [lon, FRAME.north],
      [FRAME.west, lat],
      [FRAME.east, lat],
    ] as const) {
      const p = project(a, b);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { x: Math.floor(minX), y: Math.floor(minY), width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY) };
})();

/** The distance in kilometres between two points over the earth's surface (great circle). */
export function distanceKm(a: Position, b: Position): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Whether `point` lies in the ring (even-odd rule, on longitude and latitude). */
export function inRing(point: Position, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a === undefined || b === undefined) continue;
    if (a[1] > point[1] !== b[1] > point[1] && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/** Whether `point` lies in one of the polygons, outside the holes. */
export function inPolygons(point: Position, polygons: readonly Polygon[]): boolean {
  return polygons.some((polygon) => {
    const [outer, ...holes] = polygon;
    return outer !== undefined && inRing(point, outer) && !holes.some((hole) => inRing(point, hole));
  });
}

/** The distance in kilometres from a point to a segment, on a flat map around the point (good for short ways). */
function distanceToSegmentKm(point: Position, a: Position, b: Position): number {
  const kmPerDegree = (Math.PI / 180) * EARTH_RADIUS_KM;
  const scale = Math.cos(point[1] * RAD);
  const ax = (a[0] - point[0]) * scale * kmPerDegree;
  const ay = (a[1] - point[1]) * kmPerDegree;
  const bx = (b[0] - point[0]) * scale * kmPerDegree;
  const by = (b[1] - point[1]) * kmPerDegree;
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** The distance in kilometres from a point to the nearest edge of the rings or the nearest point of a line. */
export function distanceToLinesKm(point: Position, lines: readonly Ring[]): number {
  let best = Infinity;
  for (const line of lines) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i];
      const b = line[i + 1];
      if (a !== undefined && b !== undefined) best = Math.min(best, distanceToSegmentKm(point, a, b));
    }
  }
  return best;
}

/** The distance in kilometres from a point to an area: 0 inside it, else to the nearest edge. */
export function distanceToAreaKm(point: Position, polygons: readonly Polygon[]): number {
  if (inPolygons(point, polygons)) return 0;
  return distanceToLinesKm(
    point,
    polygons.flatMap((polygon) => polygon),
  );
}

/** The centre of an area: the centroid of its largest outer ring, on longitude and latitude. */
export function centroid(polygons: readonly Polygon[]): Position {
  let best: Ring | undefined;
  let bestArea = -1;
  for (const polygon of polygons) {
    const outer = polygon[0];
    if (outer === undefined) continue;
    const area = Math.abs(signedArea(outer));
    if (area > bestArea) {
      bestArea = area;
      best = outer;
    }
  }
  if (best === undefined) return [CENTRE_LON, CENTRE_LAT];
  let cx = 0;
  let cy = 0;
  let area = 0;
  for (let i = 0; i + 1 < best.length; i++) {
    const a = best[i];
    const b = best[i + 1];
    if (a === undefined || b === undefined) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    area += cross;
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
  }
  if (area === 0) return best[0] ?? [CENTRE_LON, CENTRE_LAT];
  return [cx / (3 * area), cy / (3 * area)];
}

function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    if (a !== undefined && b !== undefined) sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

/** The direction from one point to another as one of eight: 0 north, 1 north-east, 2 east, ... 7 north-west. */
export function compass(from: Position, to: Position): number {
  const dx = (to[0] - from[0]) * Math.cos(((from[1] + to[1]) / 2) * RAD);
  const dy = to[1] - from[1];
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (Math.round(angle / 45) + 8) % 8;
}
