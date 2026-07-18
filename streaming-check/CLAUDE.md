# Projektkontext: Letterboxd Streaming Check

Next.js-App (TypeScript, App Router), die die Letterboxd-Watchlist eines Nutzers
gegen TMDB-Watch-Provider abgleicht, um zu zeigen, welche Filme auf den eigenen
Streaming-Abos verfügbar sind.

## Zu Beginn einer Session

Lies `LEARNINGS.md`, bevor du Ansätze vorschlägst. Dort steht, was schon probiert
wurde und woran es scheiterte — sonst schlägst du Dinge vor, die längst verworfen
sind.

## Wenn ich dich bitte, die README zu aktualisieren

Prüfe den aktuellen Stand des Projekts (app/, lib/, package.json) und stelle sicher,
dass die README folgende Abschnitte enthält und auf dem neuesten Stand hält:

1. **Kurzbeschreibung** – was die App macht (1-2 Sätze)
2. **Setup** – Installationsschritte, benötigte Env-Variablen (z.B. TMDB API Key),
   wie der Dev-Server gestartet wird
3. **Projektstruktur** – kurzer Überblick über app/, lib/, components/ und deren Zweck
4. **API-Routen** – Liste aller Routen unter app/api/ mit Zweck, Request-Parametern
   und Response-Format (aus dem tatsächlichen Code ableiten, nicht raten)
5. **Aktueller Stand** – welche MVP-Features bereits funktionieren, welche noch offen sind
6. **Bekannte Einschränkungen** – z.B. kein Caching, kein Error-Handling für X

Leite die Inhalte aus dem tatsächlichen Code ab, nicht aus Annahmen. Wenn du unsicher
bist, ob etwas fertig oder noch in Arbeit ist, frag nach statt zu raten.

### Und schreib danach immer LEARNINGS.md fort

Die README hält den **Ist-Stand für Menschen** fest. Was dabei verlorengeht, ist das
**Warum** — und genau das fehlt dir beim nächsten Session-Start. Ergänze deshalb bei
jedem README-Update auch einen Eintrag in `LEARNINGS.md` (neuester Eintrag oben,
Überschrift `## JJJJ-MM-TT — kurzer Titel`):

- **Was seit dem letzten Eintrag versucht wurde und wie es ausging.** Fehlschläge und
  Sackgassen ausdrücklich eingeschlossen — die sind der eigentliche Wert der Datei.
  Ein Ansatz, der nicht funktioniert hat, gehört mit dem Grund hier rein, damit ihn
  niemand ein zweites Mal vorschlägt.
- **Bewusst getroffene Entscheidungen samt Begründung** — auch bewusst *nicht*
  gemachte Dinge und warum.
- **Offene Fragen und Unsicherheiten** für das nächste Mal.

Zwei Regeln dabei:

1. **Trenne sauber.** README = Ist-Stand für Menschen. LEARNINGS.md = Warum und
   Historie für dich. Keine Statusberichte in LEARNINGS.md, keine Sackgassen-Doku
   in der README.
2. **Erfinde nichts.** Nur eintragen, was tatsächlich passiert ist. Unterscheide
   ausdrücklich zwischen „verifiziert" (du hast es laufen sehen) und „angenommen".
   Wenn du nicht weißt, wie ein Versuch ausging, frag nach — nicht plausibel
   ausformulieren.

Zeig mir die vorgeschlagenen Änderungen als Diff, bevor du sie committest.

## Weitere Konventionen
- TypeScript strict, keine `any`-Types ohne Begründung
- Route Handler bleiben dünn, Logik gehört nach lib/
