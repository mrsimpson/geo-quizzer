---
archetype: interactive
phase: commit
prePushFailures: 3
failedChecks: { checks-pass: 8 }
---

# Increment: Sterne der Runde und Gesamtsterne

*Gestartet 2026-11-17. Explore, Plan, Code, Commit.*

## Goal

Nach einer Runde sehen Lernende die Sterne dieser Runde (10 von 10 = drei Sterne) und, getrennt davon, ihre
Gesamtsterne für Stufe und Themen, auf die die Runde einzahlt.

## Key decisions

- Der Vorschlag des Erstellers (Rundensterne zeigen, klar auf die Gesamtsterne verweisen) gilt als Bestätigung.
- Rundensterne mit denselben Schwellen wie die Gesamtsterne, aber nach dem Anteil beim ersten Versuch richtig.
- Nach Rückmeldung: Entwurf 2 (Sterne mit Füllstand), ohne Erklärtext, zwei Abschnitte (Stufe | Themen), kleines „+n“ je Abschnitt (Aufgaben, die diese Runde neu gelernt wurden; `State.before`). Dieselben Füllsterne im Menü.
- Das Hineinfliegen: die Gesamtsterne landen mit einer kurzen Animation unter den Rundensternen; ohne Animation, wenn
  Bewegung reduziert ist. Ein Flug in die Kästchen des Menüs (beim Schließen) bleibt offen (guess).

## Notes

Kein neuer Inhalt, keine neue Kompetenz.

## Explore

### Tasks

- [x] Wunsch klar, keine Recherche nötig.

### Answers

- „Nach einer Runde werden die Sterne angezeigt, die schon insgesamt erworben wurden. Das können nach einer 10/10 Runde immer noch 10/120 sein, die dann keinen Stern bedeuten. Das ist irritierend."

### Completed

## Plan

### Tasks

- [x] Zusammenfassung: Rundensterne, Gesamtsterne mit Thema und Stufe, kurzer Hinweis.
- [x] Plan bestätigt durch den Vorschlag des Erstellers.

### Content method

Kein neues Muster; Leitfaden nennt die Zusammenfassung.

### Completed

## Code

### Tasks

- [x] `roundStars`, Zusammenfassung, Texte, Animation.
- [x] Leitfaden angepasst.
- [x] `npx --no -- lernapps check` besteht.
- [x] Zusammenfassung im Browser angesehen (Text, 360 px ohne Querscroll; Bilder nur über den Browser geprüft).
- [x] Jede Box von Explore, Plan und Code abgehakt, `phase: commit`.

### Completed

## Commit

### Tasks

- [x] Branch gepusht, Ja des Erstellers zum Veröffentlichen liegt vor ("Danach kannst Du mergen").

### Completed

## Retrospective

### Phases reached

Commit; Plan durch den Vorschlag des Erstellers bestätigt, Veröffentlichen vom Ersteller freigegeben.

### Creator turns after the plan

Vier: Entwürfe als Mockups, Wahl von Entwurf 2 mit zwei Abschnitten, kleines „+n“, Sterne im gewählten Zustand lesbar machen und dann mergen.

### Where I had to guess

Plan ohne ausdrückliches Ja bestätigt gewertet; „+n“ als neu gelernte Aufgaben statt Sterne; das Hineinfliegen in die Menü-Kästchen nicht gebaut.
