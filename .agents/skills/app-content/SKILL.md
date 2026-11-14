---
name: app-content
description: Use for any content work in this app - researching, writing, extending, correcting or reviewing its competencies, chapters, pages, rounds, questions, exercises, figures, terms or sources. This app's own content decisions; they take precedence over the generic lernapps content skills. Load it before you change any content.
---

# Content guide of this app

Geo Europa: an `interactive` map game for the topography of Europe. Learners find countries, capitals, rivers, mountain
ranges, lakes, seas and sub-regions on a map. All content is data: a new element needs no code.

## Curriculum

- Geography (Erdkunde), grade 5 to 6. No Land or Schulform fixed.
- Orientation: the learning map of lernapps.net, subject `erdkunde`, strand `orientierung`, competency
  `topographie-europa`, grade band 5-6 (https://lernapps.net/apps/map/erdkunde.json). It lists no Lehrplan.
- The Bildungsplan Baden-Württemberg, Geographie Klassen 5 und 6 (Lesehilfe 2025, km.baden-wuerttemberg.de) says
  "ausgewählte Staaten Europas mit Hauptstädten": it names no fixed list. The list of this app is the creator's
  decision (see Content structure).
- Prerequisite `kontinente-und-ozeane` is not practised; the start page points to it.

## Competencies

- `topographie-europa`: Ich kann Europa in Teilräume gliedern und seine Staaten, Hauptstädte, Gebirge, Flüsse und Meere
  auf einer Karte zeigen. (Wording of the learning map; never reword.) The only competency; the four levels
  (routes `stufe-1` to `stufe-4`) build on each other, each practises it with more help removed.
- Do not add a competency here; propose it to the learning map (`lernapps/apps`, `map/erdkunde.yaml`).

## Content structure

- Element kinds and files in `src/data/elements/`: `laender.json` (countries), `hauptstaedte.json` (capitals, points),
  `fluesse.json` (rivers, lines), `gebirge.json`, `seen.json`, `meere.json`, `teilraeume.json` (areas). One record per
  element, same fields everywhere: `id`, `kind` (`land`, `stadt`, `fluss`, `gebirge`, `see`, `meer`, `raum`), `level`
  (first level in which it appears, 1 to 4), `ne` (the name in the Natural Earth layer the shape comes from; several
  names separated by `|`). The shape is in `src/data/geo/<file>.json` under the same id.
- Ids: lower-case ASCII, kind first: `land-frankreich`, `stadt-paris`, `fluss-seine`, `gebirge-alpen`, `see-bodensee`,
  `meer-nordsee`, `raum-westeuropa`. An id never changes once published (it keys the learner's progress).
- Relations: records `{ "type", "from", "to" }` in `src/data/relations.json` (by hand: `hauptstadt-von`, `gehoert-zu`, and the corrections of the generated ones) and in `src/data/geo/relations-geo.json` (generated from the shapes by the script: `fliesst-durch`, `liegt-in`, `grenzt-an`; never edit). Types: `hauptstadt-von` (stadt → land),
  `fliesst-durch` (fluss → land), `liegt-in` (see, gebirge → land), `grenzt-an` (land → land, listed once, read both
  ways), `gehoert-zu` (land → raum). Each relation creates tasks of levels 2 to 4 in both directions.
- Geometry in `src/data/geo/<file>.json`: simplified shapes made from Natural Earth by `tools/build-geodata.ts`
  (public domain; the zip files go into `tools/cache`, not committed); never edit by hand, change the script and run
  `npm run geodata`. The sub-regions (`raum-*`) are the shapes of their countries (relations `gehoert-zu`).
- The six sub-regions follow the common division of German atlases; the assignment of the countries is not checked against an atlas (not checked).
- Texts in `src/messages/de.json`: `el.<id>.name` (required), `el.<id>.fact` (one or two sentences for children),
  `el.<id>.link` (address to read more, only when the page exists and was opened). Other languages: a new file
  `src/messages/<language>.json` with every key.
- Amount (first version): all states of Europe with capital (including Kosovo, Cyprus, Turkey and Russia with their
  European part, and the micro-states Andorra, Liechtenstein, Malta, Monaco, San Marino, Vatican City), 12 rivers
  (Rhein, Donau, Elbe, Oder, Weichsel, Seine, Loire, Rhône, Po, Ebro, Wolga, Dnepr), 7 mountain ranges (Alpen, Pyrenäen,
  Karpaten, Apenninen, Skandinavisches Gebirge, Ural, Balkan), 8 lakes (Bodensee, Genfer See, Gardasee, Plattensee,
  Vänern, Ladogasee, Onegasee, Peipussee), 7 seas (Nordsee, Ostsee, Mittelmeer, Schwarzes Meer, Adria, Atlantischer Ozean,
  Europäisches Nordmeer), 6 sub-regions (Nord-, West-, Mittel-, Süd-, Südost-, Osteuropa). Micro-states, Kosovo, Turkey
  and Russia have `level` 3 or higher.
- A round has 10 tasks, mostly new and hard ones, some repetition. Learning grade per task: new, practised (once
  right), mastered (right at first try in two different rounds). Stars per level and kind: one star at a third of
  the tasks practised or mastered, two at two thirds, three above 95 % mastered.

## Terminology

- Used: Land (not "Staat" in learner texts), Hauptstadt, Fluss, Gebirge, See, Meer, Teilraum, Stufe (difficulty),
  Runde (ten tasks), gekonnt. Learners are addressed with "du".
- Plain German for grade 6; short sentences; no jargon like "Topographie" in task texts (only in the entry keywords).
- Distances in km, rounded to 10 km; "ungefähr" in front.
- Names as a school atlas writes them (German exonyms: "Prag", "Moskau"; capital "Bern", not "Berne").

## Exercise patterns

- **Erkennen** (level 1): element highlighted in orange; four options of the same kind (neighbours or elements of
  similar size, never random). Task kind `erkennen`; example: `land-frankreich` → Spanien, Frankreich, Italien,
  Deutschland. Data: `elements/*.json`.
- **Beziehung** (level 2): question from one relation in both directions, four options of the same kind as the right
  one. Task kind `beziehung`, key `beziehung:<type>:<from>:<to>:<f|r>`; example: "Durch welches Land fließt der Fluss
  Seine?" from `fliesst-durch` (`fluss-seine` → `land-frankreich`, direction f). The question texts are `q.<type>.<f|r>`
  (for `liegt-in` also `.gebirge` or `.see`) in `src/messages/de.json`; they name the kind ("das Land", "der Fluss"), so that
  no article of a name is needed. A wrong option is never the subject and never another right answer to the same
  question (all answers of the same relation to the same subject are right). Topics of level 2: Nachbarländer
  (`grenzt-an`), Hauptstädte, Flüsse, Gebirge, Seen, Teilräume. Data: `relations.json`, `geo/relations-geo.json`.
- **Zeigen** (level 3): name given; learners click it on the map with borders and country names as help. Task kind
  `zeigen`. Hit: inside the area, or within the hit radius for points and lines.
- **Frei, Ort setzen** (level 4): name given; learners place a point on the map with only the coastline. Task kind
  `setzen`. Hit by distance.
- **Frei, Namen tippen** (level 4): element highlighted on the coastline map; learners type the name; suggestions and
  tolerance come only from the names of the same kind. Task kind `tippen`. Tolerance: ignore case, umlauts, ß and
  spaces; distance at most 1 for names up to 5 letters, 2 above, only when exactly one name is that close.
- **Wrong answer, in every pattern:** the right element in green and the chosen one in blue, the fact, the relations
  ("liegt in …, an …") and the link (opens only after a click). The distance line, the kilometres and the direction
  appear only where learners point (Zeigen, Frei with placing a point), never in Erkennen, Beziehung or Tippen
  (`SHOWS_DISTANCE` in `src/core/tasks.ts`). The heading of the feedback speaks of what was marked, never of its colour
  ("Welches Land war markiert?").
  Wrong options are real neighbours or look-alikes; each is told why it is wrong where a relation says so.

## Figures

- One figure: the map of Europe (SVG in the app page), equal-area projection, same extent in every task: the map first shows longitude 25° W to 50° E and latitude 34° N to 71.5° N (`START_FRAME` in `src/core/geo.ts`), so that Russia does not dominate; the data reach 68° E (`FRAME`, also in `tools/build-geodata.ts`) and the learner moves the map east to the Ural. Orange =
  the element asked for (area, point or line); blue = the learner's answer; green = the right place; dashed line =
  distance. Capitals are circles with a ring, rivers lines, lakes and seas areas.
- After an answer the map zooms to the right element and, if wrong, the chosen one. Where learners point, the distance (rounded to 10 km, middle to middle) is drawn as a dashed line and written in a box and in the feedback, with the direction from the chosen element to the right one ("im Westen").
- Level 3 shows borders and country names; level 4 shows only the coastline; levels 1 and 2 show borders without
  names.
- Alternative text: every task has a text that says what is asked without the picture ("Welches Land ist markiert? Es
  liegt im Westen Europas ..." only when it does not give the answer away; else "Eine Karte von Europa, ein Land ist
  markiert"). The tasks work with a keyboard: options with arrow keys and Enter, map by crosshair.
- Colours also differ in pattern or shape, never colour alone. Zoom with buttons, wheel, pinch and keys.
- Origin: Natural Earth, public domain (https://www.naturalearthdata.com/about/terms-of-use/); no attribution needed.

## Sources

- Geometry: Natural Earth (1:50 m, files admin_0_countries, rivers_lake_centerlines, geography_regions_polys, lakes,
  geography_marine_polys). Simplified by the script; disputed borders follow Natural Earth.
- Facts and capitals: written from an opened source per element; sentences are never copied. Read-more links: Klexikon
  (klexikon.zum.de); an element without a Klexikon page gets no link and, because the fact comes from that page, no fact
  (first version: the Weichsel, Seine, Loire, Rhône, Po, Ebro, Dnepr, Apenninen, Skandinavisches Gebirge, Plattensee,
  Vänern, Ladogasee, Onegasee, Peipussee, Adria, Europäisches Nordmeer and the six sub-regions have none). Wikipedia is
  not linked (not child-friendly). The relations that the pages of the Klexikon name differently from the shapes were
  corrected by hand in `relations.json` (Rhein: also Liechtenstein, Österreich; Donau: also Kroatien, Moldau, Ukraine;
  Balkangebirge only Bulgarien).
- Every fact and link is checked by opening the page; list unchecked ones as "not checked" in the plan.
- The creator's material stays local, never committed.

## Adding a chapter or round

Adding an element (a country, river, lake, mountain range, sea, sub-region):

1. Add the record to `src/data/elements/<kind>.json` (id, kind, level, geo key).
2. Add its geometry: extend the list in `tools/build-geodata.ts`, run `npm run geodata`, commit the changed `src/data/geo`.
3. Add its relations to `src/data/relations.json`.
4. Add `el.<id>.name`, `el.<id>.fact` and, if the page exists, `el.<id>.link` to `src/messages/de.json`.
5. Add a playthrough step only if the element changes behaviour; otherwise the existing ones keep working.
6. Run `npx --no -- lernapps check`, commit (one element or one kind per commit).

A new language: copy `src/messages/de.json`, translate every value, add the language to `languages` in `src/app.yaml`.

## Rules learned from mistakes

- A wrong option must never be the subject of the question or another right answer: in `makeTask` the right answers of a relation are excluded (found when "Ukraine" was offered as a neighbour of Ukraine).
- Names in question texts carry no article; the question names the kind ("das Land", "der Fluss") instead ("von Niederlande" is wrong German).
