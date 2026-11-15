---
# Read by the hooks, the review, the evals. Schema: @lernapps/tooling/guidance/plan-front-matter.v1.schema.json
# Keep all four keys.
# Archetype as in the app's first plan; set it when you start. Never changes.
archetype: interactive
# Current phase. Allowed values: explore, plan, code, commit. Change the value line below, never this comment.
phase: commit
# prePushFailures: failed pre-push runs of this increment, written by the hook. Never change it.
prePushFailures: 0
# failedChecks: failed rules and runs, written by lernapps check and the hooks. Never change it.
failedChecks: {}
---

# Increment: Karte, Feinschliff (Zoom, Flüsse, Griechenland)

*Gestartet 2026-11-15. Explore, Plan, Code, Commit.*

## Goal

Die Karte lässt sich ruhig zoomen, die Flüsse sind durchgehend gezeichnet und liegen über den Ländern, im freien Modus
sind die Flüsse (ohne Namen) zu sehen, und Griechenland gehört zu Südeuropa.

## Key decisions

- Die vier Änderungswünsche kamen vom Ersteller in einer Nachricht; sie gelten als Bestätigung des Plans.
- Zoom: sanftes Gleiten statt Sprüngen, Rad-Zoom nach Drehweite, Schritt der Knöpfe 1,25 statt 1,4; wer Bewegung
  reduziert haben will, bekommt keinen Übergang.
- Flüsse: Ursache der Lücken war ein Fehler im Geodaten-Skript (`.map(round)` rundete die Punkte einer Linie
  verschieden stark). Dazu feinere Quelle (Natural Earth 1:10 m), zusammengefügte Teilstücke und die Mündungen bis zum Meer.
- Flüsse werden nach den markierten Flächen gezeichnet, damit ein markiertes Land sie nicht überdeckt (Rhein).
- Griechenland: `gehoert-zu` Südeuropa; Südosteuropa bleibt als `gehoert-zu-auch`.
- Aus den neuen Flussformen folgen neue abgeleitete Beziehungen: Rhein durch Schweiz, Frankreich, Österreich; Donau
  durch Kroatien (Grenzstrecken). Die alte Handeintragung Rhein-Frankreich entfällt (guess).

## Notes

Keine neuen Kompetenzen. Quelle: Natural Earth, gemeinfrei.

## Explore

### Tasks

- [x] Archetype gesetzt, Skills vorhanden, Leitfaden gelesen.
- [x] Interview: entfällt, die Wünsche sind klar formuliert.
- [x] **Checkpoint:** research entfällt: kein neuer Inhalt.
- [x] `phase: plan` gesetzt.

### Answers

- „der Zoom ist zu schnell und zu ruckelnd"
- „Flüsse wie die Elbe werden teilweise nicht zusammenhängend gerendert oder verschwinden hinter Landesgrenzen (Rhein)"
- „im freien Modus sollten die Flüsse angezeigt werden (natürlich ohne Namen)"
- „Griechenland gehört zu Südeuropa"

### Completed

## Plan

### Tasks

- [x] Ein Schnitt, keine Teilprojekte parallel.
- [x] Content method: kein neues Muster.
- [x] **Checkpoint:** Plan bestätigt durch die Nachricht des Erstellers.
- [x] `phase: code` gesetzt.

### Content method

Wie bisher; der Leitfaden nennt jetzt Flüsse auch in Stufe 4 und die Quelle der Flüsse.

### Completed

## Code

### Tasks

- [x] Zoom sanft (Gleiten, Rad nach Weite, kleinere Schritte).
- [x] Flüsse: Skript-Fehler behoben, 1:10 m, Teilstücke verbunden, Mündungen; Zeichenreihenfolge; Stufe 4 zeigt Flüsse.
- [x] Griechenland zu Südeuropa; Teilraum-Formen neu erzeugt.
- [x] Leitfaden angepasst.
- [x] `npx --no -- lernapps check` besteht.
- [x] Bildschirme im Browser angesehen (Stufe 4 mit Flüssen, Zoom; Bilder nur über den Browser geprüft).
- [x] Jede Box von Explore, Plan und Code abgehakt, `phase: commit`.

### Completed

## Commit

### Tasks

- [ ] Branch pushen, den Ersteller um das Ja zum Veröffentlichen fragen.

### Completed

## Retrospective

### Phases reached

Code.

### Creator turns after the plan

Keine seit der Nachricht mit den vier Wünschen.

### Where I had to guess

Rhein-Frankreich als abgeleitete Beziehung; Donau-Kroatien als Grenzstrecke.
