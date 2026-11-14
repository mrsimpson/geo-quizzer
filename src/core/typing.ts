// Typing a name: what counts as the right name when a learner types it. Case, umlauts, ß, spaces and hyphens do not
// count, and a small mistake does not either (one letter in a short name, two in a long one), but only when exactly
// one name of the same kind is that near: the learner may not hit another name by chance.
import { ELEMENTS, type Kind } from "./data.ts";
import { nameOf } from "./names.ts";

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
  readonly distance: number;
}

/** The names of a kind with their distance to the text, nearest first. */
function candidates(kind: Kind, text: string, lang: string): Candidate[] {
  const typed = normalize(text);
  return ELEMENTS.filter((e) => e.kind === kind)
    .map((e) => {
      const name = nameOf(e.id, lang);
      return { id: e.id, name, distance: distance(typed, normalize(name)) };
    })
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}

/** The element a typed text stands for, or undefined when no name or more than one name is near enough. */
export function matchName(kind: Kind, text: string, lang = "de"): string | undefined {
  if (normalize(text).length === 0) return undefined;
  const near = candidates(kind, text, lang).filter((c) => c.distance <= tolerance(normalize(c.name).length));
  return near.length === 1 ? near[0]?.id : undefined;
}

/** Up to three names to suggest: those that start with the text, or are a small mistake away from it. */
export function suggestions(kind: Kind, text: string, lang = "de"): string[] {
  const typed = normalize(text);
  if (typed.length === 0) return [];
  return candidates(kind, text, lang)
    .filter((c) => {
      const n = normalize(c.name);
      return n.startsWith(typed) || c.distance <= tolerance(n.length) + 1;
    })
    .slice(0, 3)
    .map((c) => c.id);
}
