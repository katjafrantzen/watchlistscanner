# Letterboxd Streaming Check

Next.js-App (TypeScript, App Router), die die Letterboxd-Watchlist eines Nutzers
gegen die TMDB-Watch-Provider abgleicht, um zu zeigen, welche Filme über die
eigenen Streaming-Abos verfügbar sind.

> **Hinweis:** Das Projekt befindet sich in einer frühen Aufbauphase. Die
> Datenmodelle und ein erster Letterboxd-Parser stehen, die eigentliche App
> (UI und API) ist aber noch nicht implementiert. Siehe [Aktueller Stand](#aktueller-stand).

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

| Skript          | Zweck                              |
| --------------- | ---------------------------------- |
| `npm run dev`   | Startet den Next.js-Dev-Server     |
| `npm run build` | Erstellt den Produktions-Build     |
| `npm run start` | Startet den Produktions-Server     |
| `npm run lint`  | Führt ESLint aus                   |

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
│       └── scraper.ts         # Parser für Letterboxd-Watchlist-Seiten
├── public/                    # statische Assets
├── package.json
└── ...                        # Config (tsconfig, eslint, postcss, next.config)
```

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

**Noch offen:**

- Abrufen der Watchlist-HTML-Seiten (HTTP-Fetch) inkl. Paginierung über mehrere Seiten.
- TMDB-Integration: Titel-Matching (`TmdbMatch`) und Watch-Provider-Abfrage (`ProviderInfo`).
- Abgleich der Anbieter mit den Streaming-Abos des Nutzers (`availableOnUserPlatforms`).
- API-Routen unter `app/api/`.
- UI: `app/page.tsx` ist noch die unveränderte `create-next-app`-Vorlage.

## Bekannte Einschränkungen

- **Nur Einzelseiten-Parsing:** Der Scraper verarbeitet genau eine übergebene
  HTML-Seite; es gibt weder einen HTTP-Abruf noch eine Paginierung.
- **Kein Error-Handling nach außen:** Unparsbare Einträge werden übersprungen
  bzw. per `console.warn` geloggt, aber nicht an eine aufrufende Schicht gemeldet.
- **Kein Caching** von Letterboxd- oder TMDB-Daten.
- **Robustheit gegenüber Letterboxd-HTML:** Das Parsen hängt an konkreten
  Attributen (`data-component-class="LazyPoster"`, `data-item-slug`,
  `data-item-name`); Änderungen am Letterboxd-Markup brechen den Parser.
