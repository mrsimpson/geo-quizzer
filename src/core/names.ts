// The names of the elements by language, for the one place where the core needs them: comparing what a learner typed
// (src/core/typing.ts). A new language is a new message file and one line here.
import de from "../messages/de.json" with { type: "json" };

const MESSAGES: { readonly [lang: string]: { readonly [key: string]: string } } = { de };

/** The name of an element in a language; German when the language has no such name. */
export function nameOf(id: string, lang = "de"): string {
  return MESSAGES[lang]?.[`el.${id}.name`] ?? MESSAGES["de"]?.[`el.${id}.name`] ?? id;
}

/** The other names an element is known by (typed names only), from the message `el.<id>.alt`, separated by |. */
export function alternativesOf(id: string, lang = "de"): string[] {
  const alt = MESSAGES[lang]?.[`el.${id}.alt`];
  return alt === undefined ? [] : alt.split("|");
}
