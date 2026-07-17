# Projektkontext: Letterboxd Streaming Check

Next.js-App (TypeScript, App Router), die die Letterboxd-Watchlist eines Nutzers
gegen TMDB-Watch-Provider abgleicht, um zu zeigen, welche Filme auf den eigenen
Streaming-Abos verfügbar sind.

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

Zeig mir die vorgeschlagenen Änderungen als Diff, bevor du sie committest.

## Weitere Konventionen
- TypeScript strict, keine `any`-Types ohne Begründung
- Route Handler bleiben dünn, Logik gehört nach lib/
