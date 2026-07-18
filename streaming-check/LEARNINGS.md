# Learnings & Entscheidungen

Arbeitsjournal für Claude: was probiert wurde, wie es ausging, was daraus folgt.
Neuester Eintrag oben. Die README beschreibt den **Ist-Stand**, diese Datei das
**Warum** und die Historie.

---

## 2026-07-18 — Projekt-Setup: zwei npm-Projekte aufgeräumt

**Problem:** `node_modules` lag mit 1418 Dateien im Git-Repo, 1352 davon bereits auf
`origin/main` gepusht.

**Ursache:** Das Git-Root ist `Spassprojekt/`, die App liegt in `streaming-check/`.
Die einzige `.gitignore` stammt von `create-next-app` und liegt in `streaming-check/`;
ihr `/node_modules`-Eintrag ist relativ zu diesem Ordner und greift für das
Root-`node_modules` nicht. `npm install cheerio` (Commit `c176da0`) und
`npm install tsx` (`b7b85e2`) liefen im Repo-Root statt in `streaming-check/` und
legten dort ein zweites npm-Projekt an.

**Konsequenz für später:**
- npm-Befehle **immer** aus `streaming-check/` ausführen, nie aus dem Repo-Root.
- Root-`package.json`/`package-lock.json`/`node_modules` wurden gelöscht, `tsx` ist
  jetzt devDependency von `streaming-check`.
- `node_modules` wurde per `git rm -r --cached` untrackt, im Repo-Root liegt jetzt
  eine eigene `.gitignore`. Bewusst **kein** History-Rewrite — die alten Blobs
  bleiben in der History und auf GitHub (~12 MB `.git`). Falls das Repo später stört:
  `git filter-repo` + Force-Push wäre der Weg, war hier aber nicht den Aufwand wert.

---

## 2026-07-18 — Erster erfolgreicher Letterboxd-Abruf

**Versucht:** `fetchWatchlistPage(username, page)` in `lib/letterboxd/scraper.ts` —
`fetch()` gegen `https://letterboxd.com/<user>/watchlist/page/<n>/` mit einem
Browser-User-Agent im Header.

**Ergebnis:** Funktioniert. Der Abruf für `katjafrantzen`, Seite 1 lieferte 120122
Zeichen HTML mit der erwarteten Watchlist-Seite (`<meta name="description"
content="katjafrantzen's Watchlist">`).

**Konsequenz für später:**
- Der Abruf ist damit belegt, das **Parsing von echtem HTML noch nicht**.
  `test-scraper.ts` ruft nur `fetchWatchlistPage()` auf und loggt das HTML;
  `parseWatchlistPage()` wird dort nicht aufgerufen.
- Nächster sinnvoller Schritt: `parseWatchlistPage()` auf genau dieses abgerufene
  HTML loslassen und prüfen, ob überhaupt Items zurückkommen.

**Offene Fragen / Unsicherheiten:**
- **Ob der User-Agent nötig ist, wurde nicht getestet.** Er ist drin, weil Letterboxd
  Bots blockieren *könnte* — ein Gegentest ohne Header fand nie statt. Nicht als
  belegt behandeln.
- **Ob der Parser-Selektor auf echtem HTML greift, ist offen.** `parseWatchlistPage()`
  sucht `[data-component-class="LazyPoster"]`; das stammt aus statischer Betrachtung
  des Markups, nicht aus einem Lauf gegen die abgerufene Seite. Der Name „LazyPoster"
  legt nahe, dass Poster eventuell erst per JS nachgeladen werden — dann stünden die
  Attribute im gefetchten HTML gar nicht drin und der Parser liefe leer. Das ist die
  wahrscheinlichste Bruchstelle und gehört als Erstes verifiziert.
- Paginierung fehlt komplett: `fetchWatchlistPage()` holt genau die angeforderte
  Seite, es gibt keine Logik, die alle Seiten durchläuft oder das Ende erkennt.

**Bekannte Schwäche im Parser:** Filme, deren `data-item-name` nicht dem Muster
`Titel (Jahr)` folgt, werden **still** verworfen — ohne `console.warn`, anders als
bei fehlendem Slug/Namen. Bei einer unerwartet kurzen Ergebnisliste ist das der
erste Verdächtige.
