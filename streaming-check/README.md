# Letterboxd Streaming Check

Next.js-App (TypeScript, App Router), die die Letterboxd-Watchlist eines Nutzers
gegen die TMDB-Watch-Provider abgleicht, um zu zeigen, welche Filme über die
eigenen Streaming-Abos verfügbar sind.

> **Hinweis:** Das Projekt befindet sich in einer frühen Aufbauphase. Die
> Datenmodelle, ein erster Letterboxd-Parser und der HTTP-Abruf einer
> Watchlist-Seite stehen, die eigentliche App (UI und API) ist aber noch nicht
> implementiert. Siehe [Aktueller Stand](#aktueller-stand).

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

`lib/letterboxd/test-scraper.ts` ruft die erste Watchlist-Seite eines fest im
Skript eingetragenen Nutzernamens ab und gibt Länge und Anfang des HTML aus:

```bash
npm run scrape:test
```

Das Skript ruft nur `fetchWatchlistPage()` auf, **nicht** `parseWatchlistPage()`.

## Projektstruktur

```
streaming-check/
├── app/                       # Next.js App Router
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

Aktuell existieren **keine** API-Routen. Es gibt kein `app/api/`-Verzeichnis und
keine Route Handler. Sobald Routen hinzukommen, wird dieser Abschnitt mit Zweck,
Request-Parametern und Response-Format je Route ergänzt.

## Aktueller Stand

**Funktioniert bereits:**

- Next.js-Grundgerüst (TypeScript, App Router, Tailwind) ist aufgesetzt.
- Das Datenmodell in `lib/types.ts` ist definiert.
- `parseWatchlistPage(html)` in `lib/letterboxd/scraper.ts` parst **eine** HTML-Seite
  der Letterboxd-Watchlist und liefert eine `WatchlistItem[]`-Liste (Titel und Jahr
  werden aus dem `data-item-name`-Attribut getrennt).
- `fetchWatchlistPage(username, page)` lädt eine einzelne Watchlist-Seite über HTTP
  (`https://letterboxd.com/<username>/watchlist/page/<page>/`, mit gesetztem
  User-Agent) und wirft bei einer Antwort ohne `response.ok` einen `Error`.
  Manuell gegen Letterboxd getestet: Der Abruf liefert die erwartete HTML-Seite.

**Noch offen:**

- Paginierung: Bisher wird immer nur genau eine angeforderte Seite geladen, es gibt
  keine Logik, die alle Seiten einer Watchlist durchläuft.
- End-to-End-Verprobung von Abruf **und** Parsing: `parseWatchlistPage()` wurde bisher
  nur konzeptionell entwickelt, aber noch nicht auf echtem, abgerufenem
  Letterboxd-HTML ausgeführt.
- TMDB-Integration: Titel-Matching (`TmdbMatch`) und Watch-Provider-Abfrage (`ProviderInfo`).
- Abgleich der Anbieter mit den Streaming-Abos des Nutzers (`availableOnUserPlatforms`).
- API-Routen unter `app/api/`.
- UI: `app/page.tsx` ist noch die unveränderte `create-next-app`-Vorlage.

## Bekannte Einschränkungen

- **Nur Einzelseiten-Verarbeitung:** Abruf und Parsing arbeiten jeweils auf genau
  einer Seite; eine Paginierung über die komplette Watchlist fehlt.
- **Kein Error-Handling nach außen:** Unparsbare Einträge werden übersprungen
  bzw. per `console.warn` geloggt, aber nicht an eine aufrufende Schicht gemeldet.
  Filme ohne Jahresangabe im `data-item-name` fallen dabei still heraus.
- **Kein Retry/Rate-Limiting** beim Letterboxd-Abruf. `fetchWatchlistPage()` gibt
  sich per User-Agent als Browser aus; ob das dauerhaft trägt, ist offen.
- **Keine automatisierten Tests:** `test-scraper.ts` ist ein manuelles Skript mit
  fest eingetragenem Nutzernamen, kein Test-Framework und keine Assertions.
- **Kein Caching** von Letterboxd- oder TMDB-Daten.
- **Robustheit gegenüber Letterboxd-HTML:** Das Parsen hängt an konkreten
  Attributen (`data-component-class="LazyPoster"`, `data-item-slug`,
  `data-item-name`); Änderungen am Letterboxd-Markup brechen den Parser.
