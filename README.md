# Letterboxd Streaming Check

Next.js-App (TypeScript, App Router), die die Letterboxd-Watchlist eines Nutzers
gegen die TMDB-Watch-Provider abgleicht, um zu zeigen, welche Filme über die
eigenen Streaming-Abos verfügbar sind.

> **Hinweis:** Das Projekt befindet sich in einer frühen Aufbauphase. Die
> Datenmodelle, die komplette Scraper-Kette (HTTP-Abruf, Parsing, Paginierung
> über alle Seiten) und eine erste API-Route stehen und sind gegen echtes
> Letterboxd getestet; TMDB-Anbindung und UI fehlen noch. Siehe
> [Aktueller Stand](#aktueller-stand).

## Setup

Voraussetzungen: Node.js (LTS) und npm.

```bash
cd streaming-check
npm install
npm run dev
```

Anschließend [http://localhost:3000](http://localhost:3000) im Browser öffnen.

### Env-Variablen

Für den geplanten TMDB-Abgleich wird ein TMDB API Key benötigt. Eine
`.env.local` mit z.B. `TMDB_API_KEY=...` existiert im Repo noch nicht und wird
vom Code aktuell auch noch nicht gelesen (siehe [Aktueller Stand](#aktueller-stand)).

## Verfügbare Skripte

| Skript                | Zweck                                |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Startet den Next.js-Dev-Server       |
| `npm run build`       | Erstellt den Produktions-Build       |
| `npm run start`       | Startet den Produktions-Server       |
| `npm run lint`        | Führt ESLint aus                     |
| `npm run scrape:test` | Manueller Scraper-Test (siehe unten) |

> Alle npm-Befehle aus `streaming-check/` ausführen, nicht aus dem Repo-Root.

### Scraper manuell testen

`lib/letterboxd/test-scraper.ts` scrapt die vollständige Watchlist eines fest im
Skript eingetragenen Nutzernamens und gibt die Anzahl der gefundenen Filme sowie
den letzten Titel aus:

```bash
npm run scrape:test
```

Das Skript ruft `scrapeFullWatchlist()` auf und deckt damit die gesamte Kette ab
(`fetchWatchlistPage()` → `parseWatchlistPage()` → Paginierung). Es hat keine
Assertions — die Bewertung der Ausgabe bleibt manuell.

## Projektstruktur

```
streaming-check/
├── app/                       # Next.js App Router
│   ├── api/watchlist/route.ts # GET-Route: Watchlist eines Nutzers als JSON
│   ├── layout.tsx             # Root-Layout
│   ├── page.tsx               # Startseite (aktuell noch die Default-Vorlage)
│   └── globals.css            # globale Styles (Tailwind)
├── lib/                       # Domänenlogik (Route Handler bleiben dünn)
│   ├── types.ts               # zentrale TypeScript-Interfaces
│   └── letterboxd/
│       ├── scraper.ts         # HTTP-Abruf + Parser für Letterboxd-Watchlist-Seiten
│       └── test-scraper.ts    # manuelles Test-Skript (kein Test-Framework)
├── public/                    # statische Assets
├── CLAUDE.md                  # Projektkontext & Konventionen für Claude
├── LEARNINGS.md               # Arbeitsjournal: was probiert wurde und wie es ausging
├── package.json
└── ...                        # Config (tsconfig, eslint, postcss, next.config)
```

Das Git-Repo-Root liegt eine Ebene über `streaming-check/`; dort stehen nur noch
`.gitignore` und dieser Ordner.

Ein `components/`-Verzeichnis existiert noch nicht.

### Datenmodell (`lib/types.ts`)

- **`WatchlistItem`** – ein Film aus der Letterboxd-Watchlist (`letterboxdSlug`, `title`, `year`).
- **`TmdbMatch`** – ein bei TMDB gefundener Treffer (`tmdbId`, `matchedTitle`, `confidence`, `posterUrl`).
- **`ProviderInfo`** – ein Streaming-Anbieter (`providerName`, `providerId`, `type: "flat" | "rent" | "buy"`).
- **`MovieResult`** – kombiniertes Ergebnis pro Film (Watchlist-Item, TMDB-Match, Provider-Liste, `availableOnUserPlatforms`).

## API-Routen

### `GET /api/watchlist`

Scrapt die vollständige Letterboxd-Watchlist eines Nutzers und gibt sie als JSON
zurück. Der Handler ist dünn: er liest den Query-Parameter, ruft
`scrapeFullWatchlist()` auf und mappt Fehler auf Statuscodes.

**Request-Parameter** (Query-String):

| Parameter  | Pflicht | Bedeutung                  |
| ---------- | ------- | -------------------------- |
| `username` | ja      | Letterboxd-Nutzername      |

Beispiel: `GET /api/watchlist?username=katjafrantzen`

**Response 200:**

```jsonc
{
  "username": "katjafrantzen",
  "count": 236,
  "items": [
    { "letterboxdSlug": "last-night-in-soho", "title": "Last Night in Soho", "year": 2021 }
  ]
}
```

`items` ist eine Liste von `WatchlistItem` (siehe [Datenmodell](#datenmodell-libtypests)),
`count` entspricht `items.length`.

**Fehlerfälle:**

| Status | Body                                                | Wann                                          |
| ------ | --------------------------------------------------- | --------------------------------------------- |
| 400    | `{ "error": "Query-Parameter 'username' fehlt" }`   | `username` fehlt oder ist leer                |
| 500    | `{ "error": "Watchlist konnte nicht geladen werden" }` | `scrapeFullWatchlist()` wirft (Details nur im Server-Log) |

## Aktueller Stand

**Verifiziert (lief nachweislich):**

- Next.js-Grundgerüst (TypeScript, App Router, Tailwind) ist aufgesetzt.
- Das Datenmodell in `lib/types.ts` ist definiert.
- `fetchWatchlistPage(username, page)` lädt eine einzelne Watchlist-Seite über HTTP
  (`https://letterboxd.com/<username>/watchlist/page/<page>/`, mit gesetztem
  User-Agent) und wirft bei einer Antwort ohne `response.ok` einen `Error`.
  Manuell gegen Letterboxd getestet: Der Abruf liefert die erwartete HTML-Seite.
- `parseWatchlistPage(html)` in `lib/letterboxd/scraper.ts` parst **eine** HTML-Seite
  der Letterboxd-Watchlist und liefert eine `WatchlistItem[]`-Liste (Titel und Jahr
  werden aus dem `data-item-name`-Attribut getrennt). Der Selektor
  `[data-component-class="LazyPoster"]` greift auf echtem Letterboxd-HTML.
- `scrapeFullWatchlist(username)` läuft ab Seite 1 in einer Schleife über
  `fetchWatchlistPage()` + `parseWatchlistPage()`, sammelt alle `WatchlistItem`s und
  bricht ab, sobald eine Seite keine Items mehr liefert. Begrenzt auf `MAX_PAGES = 50`,
  zwischen den Abrufen liegt ein Delay von `DELAY_MS = 300`. Ein Lauf gegen einen
  echten Account lieferte 236 Filme über mehrere Seiten; die Abbruchbedingung
  „leere Seite" greift, Letterboxd antwortet jenseits der letzten Seite nicht mit 404.
- `GET /api/watchlist?username=...` in `app/api/watchlist/route.ts` gibt die
  gescrapte Watchlist als JSON zurück (siehe [API-Routen](#api-routen)) und
  antwortet mit 400 ohne `username` bzw. 500, wenn der Scrape wirft.

**Noch offen:**

- Gegenprobe, ob die gescrapte Anzahl der **tatsächlichen** Watchlist-Größe entspricht.
  Still verworfene Einträge (siehe [Bekannte Einschränkungen](#bekannte-einschränkungen))
  wären an der Zahl allein nicht zu erkennen.
- TMDB-Integration: Titel-Matching (`TmdbMatch`) und Watch-Provider-Abfrage (`ProviderInfo`).
- Abgleich der Anbieter mit den Streaming-Abos des Nutzers (`availableOnUserPlatforms`).
- Weitere API-Routen (TMDB-Matching, Provider-Abfrage, kombiniertes `MovieResult`).
- UI: `app/page.tsx` ist noch die unveränderte `create-next-app`-Vorlage und ruft
  `/api/watchlist` nicht auf.

## Bekannte Einschränkungen

- **Paginierung deckelt bei 50 Seiten:** `scrapeFullWatchlist()` bricht nach
  `MAX_PAGES = 50` ab und meldet das nicht — längere Watchlists werden still
  abgeschnitten.
- **Leere Ergebnisse sind nicht von Fehlern unterscheidbar:** `scrapeFullWatchlist()`
  wertet „Seite liefert keine Items" als Ende der Watchlist. Ein gebrochener
  Parser-Selektor sieht damit exakt aus wie eine leere Watchlist.
- **Kein Error-Handling nach außen:** Unparsbare Einträge werden übersprungen
  bzw. per `console.warn` geloggt, aber nicht an eine aufrufende Schicht gemeldet.
  Filme ohne Jahresangabe im `data-item-name` fallen dabei still heraus.
- **Kein Retry/Rate-Limiting** beim Letterboxd-Abruf. `fetchWatchlistPage()` gibt
  sich per User-Agent als Browser aus; ob das dauerhaft trägt, ist offen. Das feste
  Delay von 300 ms in `scrapeFullWatchlist()` ist ein gegriffener Wert, kein an
  Letterboxd erprobtes Limit. Ein einzelner fehlgeschlagener Abruf wirft und reißt
  den kompletten Scrape-Lauf mit.
- **`/api/watchlist` unterscheidet Fehlerursachen nicht:** Jeder Fehler aus
  `scrapeFullWatchlist()` wird zu einem 500 mit derselben Meldung. Ein nicht
  existierender Nutzername (Letterboxd antwortet mit 404, `fetchWatchlistPage()`
  wirft) sieht damit von außen aus wie ein Serverfehler; der eigentliche Grund
  steht nur im Server-Log.
- **`/api/watchlist` antwortet erst nach dem kompletten Scrape:** Der Request
  läuft synchron über alle Watchlist-Seiten inklusive 300 ms Delay pro Seite —
  bei langen Watchlists dauert die Antwort entsprechend. Kein Streaming, keine
  Teilergebnisse, kein Timeout.
- **Keine automatisierten Tests:** `test-scraper.ts` ist ein manuelles Skript mit
  fest eingetragenem Nutzernamen, kein Test-Framework und keine Assertions.
- **Kein Caching** von Letterboxd- oder TMDB-Daten.
- **Robustheit gegenüber Letterboxd-HTML:** Das Parsen hängt an konkreten
  Attributen (`data-component-class="LazyPoster"`, `data-item-slug`,
  `data-item-name`); Änderungen am Letterboxd-Markup brechen den Parser.
