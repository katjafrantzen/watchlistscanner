# Learnings & Entscheidungen

Arbeitsjournal für Claude: was probiert wurde, wie es ausging, was daraus folgt.
Neuester Eintrag oben. Die README beschreibt den **Ist-Stand**, diese Datei das
**Warum** und die Historie.

---

## 2026-07-19 — Scraper-Kette end-to-end verifiziert

**Versucht:** `test-scraper.ts` auf `scrapeFullWatchlist()` umgestellt (statt bisher
nur `fetchWatchlistPage()`) und gegen den echten Account `katjafrantzen` laufen lassen.

**Ergebnis: funktioniert.** Ausgabe des Laufs:

```
Item count:236
Last Night in Soho
```

Damit sind **drei offene Fragen aus den Einträgen vom 18./19.07. beantwortet:**

1. **Der Selektor `[data-component-class="LazyPoster"]` greift auf echtem HTML.**
   Die Vermutung, „LazyPoster" könnte bedeuten, dass die Poster erst per JS
   nachgeladen werden und die Attribute im gefetchten HTML fehlen, hat sich **nicht**
   bestätigt. Die Attribute stehen im Server-HTML.
2. **Die Paginierung terminiert sauber über die leere Seite.** Letterboxd antwortet
   jenseits der letzten Seite offenbar mit 200 und ohne Items — nicht mit 404. Die
   befürchtete Variante „`fetchWatchlistPage()` wirft am Ende jeder vollständigen
   Watchlist" ist damit widerlegt: Der Lauf ging durch, ohne zu crashen.
3. **Parser und Paginierung sind nicht mehr „geschrieben, aber nie gelaufen".**
   Die 236 Items sind über mehrere Seiten hinweg zusammengesammelt worden, das
   Mehrseiten-Verhalten ist also mitgetestet.

Es gab **keine `console.warn`-Ausgabe**. Kein Item hatte also einen fehlenden Slug
oder Namen.

**Was der Lauf ausdrücklich *nicht* zeigt:** ob 236 die **vollständige** Watchlist ist.
Die Zahl wurde nicht gegen die auf Letterboxd angezeigte Anzahl gegengeprüft. Die
bekannte Schwäche aus dem 18.07.-Eintrag bleibt genau hier gefährlich: Filme, deren
`data-item-name` nicht `Titel (Jahr)` folgt, fallen **still** heraus — ohne Warnung
und ohne Spur in der Ausgabe. Eine zu niedrige Zahl wäre am Ergebnis nicht zu erkennen.
Der Abgleich mit der echten Watchlist-Größe ist der nächste billige Schritt.

**Weiterhin offen / unverändert:**
- `MAX_PAGES = 50` und `DELAY_MS = 300` bleiben gegriffene Werte. Bei 236 Items wurde
  der Deckel nicht annähernd erreicht, er ist also auch mit diesem Lauf nicht erprobt.
- Kein Retry: Ein fehlgeschlagener Abruf reißt weiterhin den ganzen Lauf mit. Dass es
  diesmal durchlief, belegt nur, dass 300 ms in *diesem* Lauf nicht ins Rate-Limit
  gerannt sind — kein dauerhafter Beleg.
- Der tote `if (items.length > 0)` vor dem `delay()` steht unverändert im Code.

**Folge für die README:** Der Abschnitt „Implementiert, aber noch nie ausgeführt" und
die Beschreibung von `test-scraper.ts` sind jetzt überholt.

---

## 2026-07-19 — Paginierung geschrieben, aber bewusst nicht verifiziert

**Versucht:** `scrapeFullWatchlist(username)` in `lib/letterboxd/scraper.ts` —
Schleife ab Seite 1 über `fetchWatchlistPage()` + `parseWatchlistPage()`, sammelt
alle Items, bricht bei einer Seite ohne Items ab. Deckel `MAX_PAGES = 50`, Delay
`DELAY_MS = 300` zwischen den Abrufen.

**Ergebnis: nicht ausgeführt.** Der Code steht, ist aber nie gelaufen — weder gegen
echtes Letterboxd-HTML noch gegen ein Fixture. `test-scraper.ts` ruft unverändert
nur `fetchWatchlistPage()` auf. **Nicht als funktionierend behandeln.**

**Warum das hier besonders wehtut:** Die offene Frage aus dem Eintrag vom 18.07. —
ob der Selektor `[data-component-class="LazyPoster"]` auf echtem HTML überhaupt
greift — ist weiterhin offen, und die Paginierung baut jetzt direkt darauf auf.
Die Abbruchbedingung ist „Seite liefert 0 Items". Greift der Selektor nicht, liefert
schon Seite 1 null Items, die Schleife bricht nach einem Durchlauf ab und
`scrapeFullWatchlist()` gibt sauber `[]` zurück. Ein kaputter Parser und eine leere
Watchlist sind am Rückgabewert **nicht unterscheidbar**. Wer das als „läuft, findet
nur nichts" liest, sucht den Fehler an der falschen Stelle.

**Konsequenz für später:**
- Erst `parseWatchlistPage()` auf echtem HTML verifizieren, **dann** die Paginierung.
  In umgekehrter Reihenfolge ist das Ergebnis nicht interpretierbar.
- `test-scraper.ts` so erweitern, dass es die abgerufene Seite auch parst und die
  Item-Anzahl loggt. Das ist der billigste nächste Schritt und beantwortet die
  Selektor-Frage sofort.

**Bewusst nicht gemacht:** `MAX_PAGES` und `DELAY_MS` sind gegriffene Werte. 300 ms
sind nicht an Letterboxd erprobt, es gibt kein dokumentiertes Rate-Limit, gegen das
sie geprüft wären. Auch kein Retry: Ein einzelner fehlgeschlagener Abruf wirft und
reißt den ganzen Lauf mit. Beides ist für einen ersten Durchstich okay, sollte aber
nicht als bewusst austarierte Lösung missverstanden werden.

**Offene Fragen / Unsicherheiten:**
- Erkennt Letterboxd das Seitenende überhaupt über „leere Seite"? Möglich wäre auch,
  dass eine Seite jenseits der letzten mit 404 antwortet — dann wirft
  `fetchWatchlistPage()`, statt dass die Schleife sauber abbricht, und
  `scrapeFullWatchlist()` würde am Ende jeder vollständigen Watchlist crashen. Nicht
  getestet, beide Varianten sind plausibel.
- Im Code steht vor dem `delay()` ein `if (items.length > 0)`. Die Bedingung ist an
  dieser Stelle immer wahr — der Fall `0` hat die Schleife eine Zeile vorher schon
  verlassen. Harmlos, aber toter Code; vermutlich war ein „nicht nach der letzten
  Seite warten" gemeint, das so nicht greift.

**Nebenbefund:** `app/api/watchlist/` existiert als leeres Verzeichnis. Git erfasst
leere Ordner nicht, es taucht also in keinem Commit auf. Es liegt noch keine
`route.ts` darin.

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
