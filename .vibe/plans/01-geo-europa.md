---
# Read by the hooks, the review, the evals. Schema: @lernapps/tooling/guidance/plan-front-matter.v1.schema.json
# Keep all four keys.
# Archetype, null until chosen in Explore. Allowed values: explainer, interactive, quiz.
archetype: interactive
# Current phase. Allowed values: explore, plan, code, commit. Change the value line below, never this comment.
phase: explore
# prePushFailures: written by the pre-push hook. Never change it.
prePushFailures: 0
# failedChecks: failed rules and runs, written by lernapps check and the hooks. Never change it.
failedChecks: {}
---

# Plan: Geo Europa, first version

<!--
For you, the assistant.
1. Path: `.vibe/plans/01-<short name>.md`. Every later change gets its own plan from the increment template.
2. Read this plan before each step. One phase at a time, tasks in order.
3. Task done → tick `[x]` at once and move it to "Completed" of its phase. An unticked box counts as not done.
4. New task found → add it.
5. Each phase names its skills. Load a skill when its task comes, not before. Read it in full, from its file.
6. Checkpoint: stop, ask, wait for the creator's answer. A message sent before the question is no yes.
   Only a checkpoint waits. A phase's last box → set the next phase and go on in the same message.
7. At most 2 questions per message, one topic each. No questions inside drafts or lists.
8. Work on the branch `work`, locally: push nothing before Commit. Commit puts the app on GitHub and brings `work`
   into `main`.
9. Plan in the creator's language. Keep headings and front matter keys. Delete a comment once its part is filled.
10. Begin each reply to the creator with the phase in `phase:`, and at a checkpoint the word checkpoint:
    "**Plan · Checkpoint**", "**Code**". The creator always knows where you are.
-->

*Gestartet 2026-11-14. Explore, Plan, Code, Commit.*

## Goal

Kinder der 6. Klasse üben auf einer Europakarte wie in einem Spiel: Sie finden Länder, Hauptstädte, Flüsse, Gebirge, Seen und Meere, erst mit Hilfen, zuletzt ohne. Sie lernen, diese Elemente zu benennen, auf der Karte zu zeigen und ihre Beziehungen zu kennen (Hauptstadt von, fließt durch, liegt in).

## Key decisions

- Archetyp `interactive`: Lernende handeln in einem Karten-Spiel (anklicken, setzen, zuordnen, Position raten); ein Quiz kann keine Klicks auf einer Karte, ein Explainer ist auf Seiten mit Text ausgelegt.
- Karte als einfaches GIS: Geodaten (Natural Earth, gemeinfrei) vereinfacht gebündelt, Projektion und Treffertest im Kern der App, keine Server.
- Beziehungen zwischen Elementen als Daten (Hauptstadt von, fließt durch, liegt in, grenzt an), aus denen Aufgaben und Rückmeldungen entstehen.
- Falsche Antwort: Abstand zur richtigen Stelle auf der Karte zeigen (Linie, km).
- Nur Deutsch, Texte in Nachrichtendateien (vorbereitet für weitere Sprachen). Nur Europa.
- Querformat auf Handys; Abweichung von 360 px, wird in `limits` des Eintrags gesagt.
- Strang `erdkunde/orientierung`, Baustein `topographie-europa`.
- Fakt und Klexikon-Link je Element, nur wo eine Seite existiert. (guess)
- Zusätzlich zur Lernlandkarte: Teilräume Europas und Meere aufnehmen, weil der Baustein sie nennt. (guess, beim Checkpoint bestätigen)
- Auswahl der Elemente (siehe Notes: Umfang) ist ein Vorschlag. (guess)

## Notes

**Strang:** `erdkunde/orientierung` (Lernlandkarte, Fach Erdkunde). Passt, weil der Baustein `topographie-europa` dort liegt und noch keine App ihn übt.

**Lehrplan:** Land unbekannt, kein Lehrplan gelesen. Die Lernlandkarte verweist auf die DGfG-Bildungsstandards für den Mittleren Schulabschluss (Klasse 10); für Klasse 6 nicht geprüft. Orientierung nur die Lernlandkarte (Stufe 5–6).

**Kompetenzen (Ids der Lernlandkarte, Wortlaut unverändert):**
- `topographie-europa`: Ich kann Europa in Teilräume gliedern und seine Staaten, Hauptstädte, Gebirge, Flüsse und Meere auf einer Karte zeigen. (Voraussetzung `kontinente-und-ozeane`: nicht geübt, die Startseite verweist darauf.)
- Die App ist ein Spiel mit Stufen, keine Kapitel-App: die Stufen bauen aufeinander auf (Land → Hauptstadt → Fluss/Gebirge/See/Meer → Beziehungen → freie Positionen).

**Wie Kinder dorthin kommen (Herleiten):**
- Stufe 1 Erkennen: markiertes Land oder Element auf der Karte → Name aus Auswahl. Fehlvorstellung: ähnliche Namen und Lagen verwechseln; Rückmeldung zeigt den Abstand auf der Karte.
- Stufe 2 Beziehungen: "Welche Hauptstadt hat dieses Land?", "Welches Land durchfließt dieser Fluss?", "Wo liegt der See?" aus den Beziehungsdaten, mit Nachbarn als Hilfe.
- Stufe 3 Frei: Name gegeben, ohne Hilfen auf die Karte klicken; Rückmeldung zeigt Abstand zur richtigen Stelle (Linie, km) und die Beziehung ("Paris liegt in Frankreich, an der Seine").

**Umfang (Vorschlag, beim Checkpoint zu bestätigen):**
- Länder: rund 45 Staaten Europas mit Hauptstadt (Kosovo, Zypern und die Mikrostaaten Andorra, Liechtenstein, Malta, Monaco, San Marino, Vatikanstadt dabei; Türkei und Russland als Staaten mit europäischem Teil; Kaukasus-Staaten nicht).
- Flüsse (12): Rhein, Donau, Elbe, Oder, Weichsel, Seine, Loire, Rhône, Po, Ebro, Wolga, Dnepr.
- Gebirge (7): Alpen, Pyrenäen, Karpaten, Apenninen, Skandinavisches Gebirge, Ural, Balkan.
- Seen (8): Bodensee, Genfer See, Gardasee, Plattensee, Vänern, Ladogasee, Onegasee, Peipussee.
- Meere (7): Nordsee, Ostsee, Mittelmeer, Schwarzes Meer, Adria, Atlantischer Ozean, Europäisches Nordmeer.
- Teilräume (6): Nord-, West-, Mittel-, Süd-, Südost-, Osteuropa.
- Nicht dabei: andere Kontinente, Inseln als eigene Elemente (nur Island, Irland, Zypern, Malta, Vereinigtes Königreich als Länder), Städte außer Hauptstädten, Gradnetz. Grund: Baustein Europa, erste Version.
- Sprachen: Deutsch.

**Quellen und Lizenzen:**
- Geodaten: Natural Earth (naturalearthdata.com), gemeinfrei, Nutzungsbedingungen geöffnet und gelesen (geprüft). Dateien (admin_0_countries, rivers_lake_centerlines, geography_regions_polys, lakes, geography_marine_polys) auf naciscdn.org erreichbar (nur Kopfzeilen geprüft; Inhalt noch ungeprüft).
- Weiterlesen: Klexikon, klexikon.zum.de (Stichproben geöffnet, geprüft: Frankreich, Liechtenstein, Paris, Rhein, Donau, Alpen, Bodensee, Nordsee und mehr). Fehlen: Skandinavisches Gebirge, Ladogasee, Reykjavík, Tajo, Don. Keine Sätze kopiert, nur verlinkt.
- Fakten: eigene Formulierung nach geöffneten Quellen; jeder Fakt wird in Code anhand einer geöffneten Seite geprüft. Noch ungeprüft.

**Offene Fragen:** Auswahl der Elemente und der Teilräume; Kosovo und Türkei/Russland.

## Explore

<!--
- Find out what the app teaches, for whom, how much and how it looks. All content questions belong here; Plan only
  maps the answers onto the archetype.
- Ask. Write no code, run no `create`.
- An answer counts only in the creator's words under "Answers". Never tick a topic you assumed.
- Skills: `lernapps-app`, `lernapps-exercise-patterns`, `lernapps-<archetype>-design`, `lernapps-content-research`.
-->

### Tasks

- [x] The skills of the phases are in `.agents/skills/` (`npx --yes @lernapps/tooling init <short name>` put them there
      and wrote this plan; the app commits them). `.agents/skills/lernapps-app` missing → stop and tell the creator
      the folder was not started with `init`. `git branch --show-current` prints `work`; else `git switch -c work`.
- [x] Load skill `lernapps-app`. Tell the creator in two sentences what a lernapps app is and where it will live: at
      their own address, free, public, and once listed as a copy on lernapps.net. The technical part (GitHub) comes at the end, and you do it.
- [x] Interview: ask the topics "Goal" and "Learners" of "Answers".
- [x] No fixed content yet ("an app for my class", "a gap on the map") → load skill `lernapps-map-assignment` and
      write its assignment first; its yes answers the topics it covers.
- [x] Load skill `lernapps-exercise-patterns` and read the patterns of the subject: how will learners practise what
      the goal names? The kind of practice points to the archetype, as the skill says.
- [x] Choose the archetype as skill `lernapps-app` says, from the kind of practice: read the README of each
      archetype in question, tell the creator what the chosen one can and cannot do. Write it and its reason under
      "Key decisions". Set `archetype`.
- [x] Install the archetype's skills: `npx --no -- lernapps skills --archetype <archetype>`. Load skill
      `lernapps-<archetype>-design`.
- [x] Interview: ask the other topics of "Answers" in order. Skip a topic an earlier answer covers; note which.
      A confirmed assignment covers Goal, Learners, Content, Amount and Languages; an explainer has no "Look and
      feel" (its look is the runtime's): note "covered by the assignment" or "fixed by the archetype", ask only the
      rest. No answer → ask once more; still none → write your assumption with "(guess)". Done when every topic has
      an answer, a note or a guess.
- [x] Load skill `lernapps-content-research`. Research as it says. Under "Notes": curriculum orientation (none
      when the content comes from the map, an assignment or a strand: the map gives the order), competencies by
      chapter as "Ich kann …", verified sources. No competencies → not done. First the learning map as
      skill `lernapps-content-research` says: recommend a strand that fits (`<subject>/<strand>`), else `none`; with a
      strand, only its competencies, by their ids from the map. A map with `explainerFocus: competency` also allows a
      unit app across strands (`subject: <subject>`), one strand per page. Write both under "Notes", and how they map onto
      chapters and pages (an explainer: as a rule one page per competency; competencies that build on each other, by
      the map's `requires`, share a chapter, in that order).
- [x] Under "Notes", one line per competency: how learners get there (derive, not only read off; e.g. a tree diagram
      shows how a probability comes about), which misconception the feedback catches.
- [x] Under "Notes", the scope: what is in, what is out and why, the data range (e.g. "all main-group elements",
      never a silent "1–20"), the languages.
- [x] Fetch https://lernapps.net/apps/schemas/entry.v1.schema.json and read each property's description. Ask what
      helps teachers and parents find the app. Fill "Entry draft". Search words: one or two words each, as people
      type them.
- [ ] **Checkpoint:** research. Show in plain words: the strand or why none, curriculum orientation (not with a
      strand), competencies by chapter (with their ids) and their pages, didactic approach, scope, every "(guess)", sources and how you
      checked them, what is unchecked, archetype and reason. With a strand, the map decides the structure: competencies
      that build on each other (its `requires`) share a chapter, in that order; no curriculum search is needed for it.
      Stop and wait. Changes → change, ask again.
- [ ] Set `phase: plan`: change the value line (`grep '^phase:'` prints `phase: plan`).

### Answers

<!-- The interview: per topic the creator's answer, in their words. Keep the topics. -->

- Goal: Kinder sollen die Länder Europas, ihre Hauptstädte und deren Lage kennen, dazu Flüsse in der Nähe, eventuell wichtige Gebirge und Seen. Sie sollen auf einer interaktiven Karte rätseln, Elemente benennen und Positionen erraten.
- Learners: Geographie, 6. Klasse (Topologie Europas, übliches Thema). Land and Schulform only if the creator names a school or class,
  at most once; none → KMK-Bildungsstandards.
- Model and focus: Fokus Spielgefühl auf der Karte (Ersteller: "wie ein Spiel, kartenorientiert"). Katalog gelesen; Modell-App noch offen (guess: keine).
- Hurdles: Keine Verwechslungen vorhergesagt, auch nicht nötig. Bei falscher Antwort soll die räumliche Distanz zwischen gegebener und richtiger Antwort auf der Karte sichtbar werden.
- Content: Zu jedem Land, jeder Hauptstadt, jedem Fluss, Gebirge, See und Meer ein kleiner, kindgerechter Fakt und, wo es eine passende Seite gibt, ein Link zum Nachlesen; nicht Wikipedia (für Kinder nicht kindgerecht), gern auch ohne Link. Geprüft: Klexikon (klexikon.zum.de) hat Seiten zu fast allen Ländern, Hauptstädten, großen Flüssen, Gebirgen und Meeren; Lücken (z. B. Reykjavík, Tajo, Ladogasee) bekommen keinen Link. Fakten schreibe ich selbst, keine Sätze kopiert. (guess) Assistent aus offenen Quellen, Kartendaten z. B. Natural Earth (gemeinfrei), als vereinfachte Geodaten in der App gebündelt. Original-Frage: who writes it (creator, you, from sources); own material (worksheets, tests); how it is made (sources,
  research, a data format).
- Amount: Alle Staaten Europas (rund 44) mit Hauptstädten, dazu eine überschaubare Auswahl großer Flüsse, Gebirge und Seen (Ja des Erstellers). Später mehr.
- Languages: Erst nur Deutsch, aber für Mehrsprachigkeit vorbereitet (alle Texte in Nachrichtendateien). Erst nur Europa, auf einer Europakarte. Original-Frage: German only, or German and English (texts, code). Never English only: an app without German still has
  German pages and runtime texts, so it mixes both. The creator wants English → offer German and English,
  both complete, and say why.
- Look and feel: Wie ein Spiel, kartenorientiert. Mobil nur im Querformat (Abweichung von 360 px, kommt in `limits` des Eintrags). Mehrere Schwierigkeitsstufen entlang der Aufgabe: am einfachsten Land mit Umriss auf der Karte markiert → Frage (Hauptstadt, längster Fluss, markiertes Gebirge …), über Namen aus Auswahl wählen, bis zum freien Anklicken von Positionen auf einer Karte ohne Hilfe. Idee: ein einfaches GIS als Basis. Dunkelmodus: noch offen.
- Terms: Land, Hauptstadt, Fluss, Gebirge, See, Meer, Stufe (Schwierigkeit), Runde (Spielrunde), Teilraum (Ja des Erstellers).

### Entry draft

<!-- YAML valid against the entry schema, with its property names. Only known values, never invented. -->

```yaml
title: Geo Europa
subject: erdkunde
grades: [5, 6]
summary: >-
  Kinder üben auf einer Europakarte wie in einem Spiel: Sie finden Länder, Hauptstädte, Flüsse, Gebirge, Seen und
  Meere, erst mit Hilfen, zuletzt ganz ohne. Fällt ein Tipp daneben, sehen sie, wie weit er vom richtigen Ort entfernt ist.
strand: erdkunde/orientierung
competencies: [topographie-europa]
keywords: [Europa, Hauptstädte, Länder, Karte, Topographie, Erdkunde, Geographie]
limits: Auf dem Handy nur im Querformat nutzbar, weil die Karte Platz braucht; die Breite von 360 px im Hochformat wird nicht unterstützt.
```
<!-- creator, url, source, commit, topics: later, in Commit -->

### Completed

## Plan

<!--
- Map the confirmed content onto the archetype: structure, screens or pages, exercise patterns, data files,
  components.
- No new content questions. A content gap → back to Explore; say so.
- Confirmable in one read. After the yes, work on your own: at most 3 creator turns until the listing.
- Skills: `lernapps-<archetype>-design` and `lernapps-exercise-patterns`, both loaded in Explore.
-->

### Tasks

- [ ] `grep '^phase:'` prints `phase: plan`; else set it.
- [ ] Map the content as skill `lernapps-<archetype>-design` says; reread it if it is no longer in view.
- [ ] Choose a pattern per competency as skill `lernapps-exercise-patterns` says (loaded in Explore; reread it if it
      is no longer in view). Write "Content method".
- [ ] Write the Code tasks under "Code": pages or screens, their content, what each shows. Each ends in a commit:
      one task, one commit. Steps too small for a commit of their own → one task.
      The first task: one complete page or screen as the pattern for the others (`early-preview`).
- [ ] Each screen, component or interactive exercise: a sketch (static SVG or image, or the steps with what
      learners see after each). Words alone are not enough. Keep sketch files in `.vibe/sketches/`, which `create` leaves alone.
- [ ] Show the creator, short: goal, competencies by chapter (chapters along the map's `requires`), entry draft, tasks, sketches; the content method in
      plain words (what learners see and do, what it cannot do). At most 2 questions.
- [ ] **Checkpoint:** confirm the plan and the content method, with the sketches shown. Stop and wait for an
      explicit yes. Changes → change, ask again. No `create` before the yes.
- [ ] Set `phase: code`: change the value line (`grep '^phase:'` prints `phase: code`).

### Content method

<!-- One line each: exercise patterns and where; figures and how they are made; data files; each component, what it
checks and cannot; how a later agent adds a chapter. Each figure, model and component: its learning action in two to
four sentences: the whole, what its parts and marks mean, what learners do and what stays the same, how that leads to
the statement (an explainer: rule `explainer-representation-explained`). A control without a part in it goes. An explainer on the map: per page its prerequisites (`requires`)
the app does not practise, and which get a recap page, which a link. Becomes the content guide in Code. -->

### Completed

## Code

<!--
- Build the app from the archetype and the confirmed plan, locally on `work`. Work on your own.
- Commit after each task, literally: one task, one commit, its box ticked in it; the hooks check. Never one commit
  for several tasks: join them into one task in the plan first. A check fails → skill `lernapps-cli`. Fix from the message; never
  bypass a hook.
- Undecidable → choose, mark "(guess)" under "Key decisions", go on.
- Creator asks for a change → first say your reading in one sentence ("Ich nehme alle 44 Hauptgruppenelemente
  auf."); never narrow it silently. Content change → update "Notes" too.
- Skills: `lernapps-cli`, `lernapps-<archetype>`, `lernapps-content-questions`, and the app's content guide
  `app-content`.
-->

### Tasks

- [ ] `grep '^phase:'` prints `phase: code`; else set it.
- [ ] Load skill `lernapps-cli`. Create the app in this plan's folder as it says. `create` keeps this plan. Never
      write the app by hand.
- [ ] Fill the content guide `.agents/skills/app-content/SKILL.md` from "Notes" and "Content method"
      (`app-content-guide`). Keep its nine headings and fill each: Curriculum, Competencies, Content structure,
      Terminology, Exercise patterns, Figures, Sources, Adding a chapter or round, Rules learned from mistakes
      ("None yet." until the first). `grep -c "FILL IN" .agents/skills/app-content/SKILL.md` prints 0. Commit it
      before any content.
- [ ] Load skill `lernapps-<archetype>` and the content guide. Questions with options and feedback: also skill
      `lernapps-content-questions`.
- [ ] An explainer: decide on `scope` as `references/structure.md` of skill `lernapps-explainer` says. Needed with an
      `open-task` or the creator's material: then `scope` in `src/app.yaml` and on every page
      (`explainer-scope-matches`). Write the choice under "Key decisions".
- [ ] <the first task written in Plan, the pattern page; commit on `work`>
- [ ] **Checkpoint:** the pattern page (`early-preview`): check it against the design rules, let a sub-agent check
      it as a learner, show it to the creator, wait for the answer. A change → change the pattern first.
- [ ] <the other tasks written in Plan, after the pattern; after each, commit on `work`>
- [ ] The content guide matches what was built (`app-content-matches`).
- [ ] `npx --no -- lernapps check` passes.
- [ ] Look at a screenshot of every screen and state (start, each mode, pause, end), desktop and 360 px. Compare
      each with the confirmed sketches; each figure in its own image (`npx --no -- lernapps screenshots --desktop`).
      Your tools cannot show an image: check each screen in the browser instead (text, element boxes at both widths),
      write that under "Notes" and tick the box.
- [ ] Every box of Explore, Plan and Code ticked.
- [ ] Set `phase: commit`: change the value line (`grep '^phase:'` prints `phase: commit`).
      No checkpoint here: set it before you ask or report anything, then start Commit in the same message.
      The creator asked to stop before publishing (e.g. a trial) → stop instead: leave this box open, the reason
      under it.

### Completed

## Commit

<!--
- Put the app on GitHub, publish it with the creator's yes, then list it. A push to `main` publishes.
- Open the pull requests (to `main`, to the catalog) without asking: they publish nothing; their preview and result
  are what the creator decides on.
- Skills: `lernapps-explainer-self-assessment` (an explainer), `lernapps-github`, `lernapps-commit`,
  `lernapps-listing`.
-->

### Tasks

- [ ] `grep '^phase:'` prints `phase: commit`; else set it.
- [ ] An explainer: load skill `lernapps-explainer-self-assessment` (missing → `npx --no -- lernapps skills --archetype
      explainer`). Add the self-assessment as it says, or
      write under "Key decisions" why the app has none. Commit; the hooks check.
- [ ] Load skill `lernapps-github`. Repo and Pages as it says: ask the repo name and every click only the creator can
      make in one message.
- [ ] Push `work`, open the preview pull request, see its checks to green as the skill says.
- [ ] **Checkpoint:** publish. Show what the app does and the preview link from the comment "Vorschau der App"; ask
      whether it may go online; put any open click into the same question. Wait for the yes.
- [ ] Load skill `lernapps-commit`. Publish as skill `lernapps-github` says: `work` into `main` as one squash commit
      with the message from this plan, the run of `Pages` watched to the end.
- [ ] Open the address the job `deploy` printed; confirm the app shows. Use that address, never a derived one.
- [ ] Load skill `lernapps-listing`. Complete the entry draft (e.g. the address).
- [ ] Fill the retrospective.
- [ ] Commit this plan on `main` and push it: the listing check and the review read it there.
- [ ] **Checkpoint:** list. Open the listing pull request as the skill says, without asking first: the pull request
      is the review. See it to "bestanden", then show the creator the pull request and its result; change nothing in
      it without their word.
- [ ] Plan changed since its last push → commit it on `main`, push again.

### Completed

## Retrospective

<!-- At the end of Commit, before the listing pull request. Facts, short, no names. Read by review and evals. -->

### Phases reached

<!-- Last phase completed, checkpoints passed. E.g. "commit; confirmed, published". -->

### Creator turns after the plan

<!-- Number of creator messages after the confirmation, topic of each. Target: at most 3. -->

### Where I had to guess

<!-- Each gap in plan, skills, messages or answers, and your choice. "None" if none. -->
