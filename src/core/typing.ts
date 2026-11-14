// Typing a name: what counts as the right name when a learner types it. Case, umlauts, ß, spaces and hyphens do not
// count, and a small mistake does not either (one letter in a short name, two in a long one), but only when exactly
// one name of the same kind is that near: the learner may not hit another name by chance.
import { ELEMENTS, type Kind } from "./data.ts";
import { alternativesOf, nameOf } from "./names.ts";

/** A name or a text typed, without what does not count: lower case, ae/oe/ue for umlauts, no accents, no spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** The number of letters to change, insert or delete to make `a` into `b`. */
export function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** How many letters may be wrong in a name of this length. */
export function tolerance(length: number): number {
  return length <= 3 ? 0 : length <= 5 ? 1 : 2;
}

interface Candidate {
  readonly id: string;
  readonly name: string;
  /** The distance to the nearest of the names the element is known by. */
  readonly distance: number;
  /** The length of that nearest name, which the tolerance depends on. */
  readonly length: number;
  /** Whether one of the names starts with the text. */
  readonly prefix: boolean;
}

/** The elements of a kind with their distance to the text, nearest first. */
function candidates(kind: Kind, text: string, lang: string): Candidate[] {
  const typed = normalize(text);
  // an element is as near as its nearest name: the name itself or another one it is known by (Weißrussland, Holland)
  return ELEMENTS.filter((e) => e.kind === kind)
    .map((e) => {
      const name = nameOf(e.id, lang);
      const all = [name, ...alternativesOf(e.id, lang)].map((n) => normalize(n));
      let best = { distance: Infinity, length: 0 };
      for (const n of all) {
        const distanceToName = distance(typed, n);
        if (distanceToName < best.distance) best = { distance: distanceToName, length: n.length };
      }
      return { id: e.id, name, ...best, prefix: all.some((n) => n.startsWith(typed)) };
    })
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}

/** The element a typed text stands for, or undefined when no name or more than one name is near enough. */
export function matchName(kind: Kind, text: string, lang = "de"): string | undefined {
  if (normalize(text).length === 0) return undefined;
  const near = candidates(kind, text, lang).filter((c) => c.distance <= tolerance(c.length));
  return near.length === 1 ? near[0]?.id : undefined;
}

/** Up to five names to suggest: first those that start with the text, then those a small mistake away from it (by the tolerance). */
export function suggestions(kind: Kind, text: string, lang = "de"): string[] {
  if (normalize(text).length === 0) return [];
  const found = candidates(kind, text, lang).filter((c) => c.prefix || c.distance <= tolerance(c.length));
  const prefixed = found.filter((c) => c.prefix).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const near = found.filter((c) => !c.prefix);
  return [...prefixed, ...near].slice(0, 5).map((c) => c.id);
}
