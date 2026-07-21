# Learnings & Entscheidungen

Arbeitsjournal für Claude: was probiert wurde, wie es ausging, was daraus folgt.
Neuester Eintrag oben. Die README beschreibt den **Ist-Stand**, diese Datei das
**Warum** und die Historie.

---

## 2026-07-21 — `searchProviders()` repariert und verifiziert

**Ausgangspunkt:** Der Nutzer meldete `(0 , import_match.searchMovie) is not a
function` beim Aufruf von `test-match.ts`. **Der Fehler war beim Nachstellen schon
weg** — `searchMovie` ist inzwischen exportiert, der Lauf über `npm run match:test`
lieferte die erwartete Ausgabe (zwei `OK`, ein erwartetes `FAIL`). Die Meldung
bedeutet in tsx' CJS-Ausgabe: Modul gefunden, aber der Name darin ist `undefined` —
also ein fehlender Name, **nicht** ein falscher Pfad (das wäre
`Cannot find module`).

**Ursache im Nachhinein belegt:** Der Diff gegen HEAD zeigt, dass die Funktion dort
noch `searchMovieId` heißt — die Umbenennung zu `searchMovie` war uncommitted.
`test-match.ts` importierte also schon den neuen Namen, während `match.ts` noch den
alten exportierte. Merkposten: Bei „is not a function" auf einem frischen Import
zuerst `git diff` auf das importierte Modul, nicht den Import-Pfad verdächtigen.

**Der eigentliche Fund:** Beim Draufschauen war `searchProviders()` in drei Punkten
kaputt und **war offensichtlich nie gelaufen**:

1. Die URL enthielt `movie/movie_id/watch/providers` — der Platzhalter aus der
   TMDB-Doku stand als Literal drin, der Parameter wurde nie eingesetzt.
2. `return data` gab das Wrapper-Objekt zurück, wo `ProviderInfo[]` deklariert war.
3. **Die angenommene Response-Form war grundfalsch.** Der Code erwartete
   `results` als flaches Array von `ProviderInfo`. TMDB liefert aber nach Region
   *und* darin nach Angebotsart geschachtelt:
   `{ results: { DE: { flatrate: [...], rent: [...], buy: [...] } } }`.
   Das hätte also auch mit korrigierter URL nie funktioniert.

Punkt 3 ist der Grund, warum `WATCH_REGION = 'DE'` deklariert, aber ungenutzt
herumlag: An der Stelle, an der die Konstante gebraucht wird, war die Struktur
nicht abgebildet.

**Ergebnis: funktioniert, selbst laufen gesehen.** Wegwerf-Skript gegen die echte
API, Dune (438631): 24 Provider, korrekt auf die drei Typen verteilt —
`flat` (RTL+, HBO Max), `rent` und `buy` (Apple TV Store, Amazon Video, …).
Unbekannte ID `999999999` → `Provider search fehlgeschlagen (404)`.
`tsc --noEmit` sauber. Das Skript wurde danach gelöscht; es gibt **keinen
dauerhaften Test für `searchProviders()`** — anders als bei `searchMovie`.
Das ist eine Lücke, kein bewusster Verzicht.

**Bewusste Entscheidungen:**
- **Signatur `tmdbId: number` statt `id: string`**, passend zu `TmdbMatch.tmdbId`.
  Das Ergebnis von `searchMovie()` geht jetzt ohne Konvertierung weiter.
- **Region ohne Treffer → `[]`, kein Throw.** Ein Film, den es in DE nirgends legal
  gibt, ist ein Normalzustand, kein Ausnahmefall. Passt zu
  `MovieResult.providers: ProviderInfo[]`, das kein `null` vorsieht. Beachten: Ein
  404 (Film unbekannt) wirft weiterhin — die beiden Fälle sind also unterscheidbar.
- **Rohe API-Form inline im `as`-Cast**, kein eigenes Interface in `types.ts`.
  Konsistent mit `searchMovie`, und `types.ts` bleibt frei von API-Typen. Der
  Nutzer hat das so entschieden, nachdem ich zuerst ein Interface eingeführt hatte.
- **`type: "flat"`, obwohl TMDB das Feld `flatrate` nennt.** Auf das bestehende
  `ProviderInfo` gemappt, statt den Typ an TMDBs Vokabular anzupassen.

**Offene Fragen / Unsicherheiten:**
- Nur gegen **einen** Film verifiziert. Ob ein Film ganz ohne DE-Provider
  tatsächlich `results.DE` fehlen lässt (statt eines leeren Objekts), ist
  **angenommen, nicht geprüft** — der `[]`-Pfad ist ungetestet.
- Provider-Einträge wie „HBO Max Amazon Channel" tauchen **zusätzlich** zum
  Basis-Provider auf. Für `availableOnUserPlatforms` heißt das: ein naiver
  Namensabgleich gegen die Abos des Nutzers wird zu viele oder zu wenige Treffer
  liefern. Der Abgleich sollte über `providerId` laufen, nicht über den Namen.
- Ein Film kann denselben Provider in mehreren Typen haben; die Funktion gibt ihn
  dann mehrfach zurück (einmal je Typ). Das ist so gewollt, muss aber beim Zählen
  im UI bedacht werden.
- Die Rate-Limit-Frage verschärft sich: Der volle Durchlauf braucht jetzt **zwei**
  Calls pro Film, bei 236 Filmen also ~472 statt 236.

---

## 2026-07-21 — `searchMovieId()` gegen echtes TMDB verifiziert

**Versucht:** `lib/tmdb/match.ts` testbar gemacht und ausgeführt. Zwei Dinge standen
dem im Weg: `searchMovieId()` war **nicht exportiert** (von außen nicht aufrufbar),
und es gab **keine `.env`-Datei** im Projekt — weder im Repo-Root noch in
`streaming-check/`. `getAuthHeaders()` wirft ohne Token sofort.

Vorgehen nach dem Muster des Scrapers: kein Test-Framework, sondern ein
`tsx`-Skript `lib/tmdb/test-match.ts` mit drei Fällen (zwei echte Titel, ein
Fantasietitel für den Leerpfad), jeder Fall in eigenem `try/catch`, damit ein
Fehlschlag die übrigen nicht mitreißt. Neues Skript `match:test` in der
`package.json`, mit `--env-file=.env.local` — Node 24 kann das nativ, und
`next dev` lädt die Datei nur im Server-Kontext, nicht für ein Standalone-Skript.

**Ergebnis: funktioniert, selbst laufen gesehen.** Zwei Läufe:

1. Ohne Token, um die Verdrahtung zu prüfen — dreimal
   `TMDB_READ_ACCESS_TOKEN is not set in environment variables.` Damit waren Import,
   Export und Compile belegt, bevor überhaupt ein Netz-Call stattfand.
2. Nach Anlegen von `.env.local` durch den Nutzer:

```
OK   "Last Night in Soho" (2021) -> { tmdbId: 576845, ... }
OK   "Dune" (2021) -> { tmdbId: 438631, ... }
FAIL "Ein Film, den es nicht gibt xyzzy" (1999) -> Keine TMDB-Ergebnisse gefunden
```

Damit ist **verifiziert:** Der Read Access Token wird als `Bearer` akzeptiert (kein
401), die Query-Parameter sind gültig, die Response enthält `id`, `title` und
`poster_path` in der erwarteten Form, die Poster-URL wird korrekt zusammengesetzt,
und der `throw` bei leerem `results` greift mit lesbarer Meldung.

Das `FAIL` in Zeile 3 ist der **erwartete** Pfad. Die Beschriftung im Skript sagt
„Exception geflogen", nicht „Test fehlgeschlagen" — beim nächsten Lesen nicht als
Defekt missverstehen.

**Was der Lauf ausdrücklich *nicht* zeigt:** ob `results[0]` bei mehrdeutigen Titeln
der richtige Film ist. „Dune" (2021) hat sauber getroffen, obwohl es auch die
1984er-Verfilmung gibt — das ist **ein Datenpunkt, kein Beleg**. Ob der
`year`-Parameter bei TMDB hart filtert oder nur die Sortierung beeinflusst, ist
**angenommen, nicht geprüft**. Ein Remake-Titel wie „The Thing" wäre der ehrlichere
Test und ist der billigste nächste Schritt.

**Bewusst *nicht* gemacht:** `searchMovieId()` **wirft**, statt `null` zu liefern,
wenn nichts gefunden wird. Für den Einzelaufruf ist das in Ordnung. Sobald die
Funktion über die volle Watchlist läuft (236 Filme, siehe 19.07.), reißt **ein
einziger Nicht-Treffer den ganzen Lauf mit** — und Nicht-Treffer sind dort zu
erwarten, weil der Letterboxd-Parser Titel im Format `Titel (Jahr)` liefert, das
nicht zwingend TMDBs Schreibweise trifft. Das ist die wahrscheinlichste Bruchstelle
beim ersten Batch-Durchlauf. Die Entscheidung Throw-vs-`null` gehört getroffen,
*bevor* der Batch gebaut wird, nicht danach.

**Offene Fragen / Unsicherheiten:**
- Kein Rate-Limit-Verhalten erprobt. TMDB hat dokumentierte Limits; drei
  sequentielle Calls sagen darüber nichts. Bei 236 Filmen in Folge ist das relevant,
  hier gilt dieselbe Unsicherheit wie beim Letterboxd-Scraper.
- `include_adult=true` steht in der Query. Ob das Absicht war, ist unklar —
  es vergrößert den Ergebnisraum und damit das Risiko eines falschen `results[0]`.
- Die Provider-Abfrage (`ProviderInfo`, `MovieResult` sind in `lib/types.ts` schon
  importiert) existiert noch nicht. `match.ts` kann bisher nur suchen, nicht
  ermitteln, wo ein Film läuft.

---

## 2026-07-19 — Erste API-Route: `GET /api/watchlist`

**Versucht:** `app/api/watchlist/route.ts` — dünner GET-Handler, der `username`
aus dem Query-String liest, `scrapeFullWatchlist()` aufruft und
`{username, count, items}` als JSON zurückgibt. Ohne `username` → 400, bei einem
Throw aus dem Scraper → 500 plus `console.error`.

**Ergebnis: funktioniert — allerdings nach Aussage des Nutzers, nicht von mir
laufen gesehen.** Ich habe die Route in dieser Session ausdrücklich *nicht*
ausgeführt (der Nutzer hat sie selbst getestet und mich nur um die Doku gebeten).
Für den nächsten Session-Start heißt das: „getestet" ja, aber nicht mit demselben
Beleg wie der Scraper-Lauf vom selben Tag, wo die Ausgabe hier im Journal steht.
**Nicht bekannt ist, welche Fälle konkret abgedeckt wurden** — ob nur der
Happy Path oder auch der 400er und der 500er. Falls jemand das nachträglich weiß:
hier ergänzen.

**Bewusste Entscheidungen:**
- Der Handler bleibt dünn, die Scrape-Logik bleibt in `lib/` (Konvention aus
  CLAUDE.md). Deshalb steht in `route.ts` außer Parameter-Prüfung und
  Fehler-Mapping nichts.
- Die Fehlermeldung nach außen ist bewusst generisch (`"Watchlist konnte nicht
  geladen werden"`), Details gehen nur ins Server-Log. Preisgabe der internen
  Fehlermeldung an den Client wurde damit vermieden.

**Bewusst *nicht* gemacht — und das ist die interessante Stelle:** Es gibt **keine
Unterscheidung der Fehlerursachen.** Ein nicht existierender Letterboxd-Nutzer
lässt `fetchWatchlistPage()` bei Seite 1 mit 404 werfen, und das landet im selben
`catch` wie ein echter Serverfehler → 500. Fachlich wäre das ein 404. Wer später
im Frontend „Nutzer nicht gefunden" anzeigen will, muss dafür zuerst den Fehler
aus `scraper.ts` typisieren — am Statuscode allein ist es nicht erkennbar.

Ebenfalls nicht gemacht: keine Validierung des Nutzernamens über den
Leer-Check hinaus. `request.nextUrl.searchParams.get()` liefert bei `?username=`
den leeren String, der über den Falsy-Check als fehlend gilt (aus dem Code
abgeleitet, nicht ausprobiert). Ein `username` mit Sonderzeichen geht dagegen
ungefiltert in die URL.

**Zweite Altlast, die jetzt sichtbar wird:** Die Route erbt die
Ununterscheidbarkeit aus dem Eintrag vom 19.07. — eine leere Watchlist und ein
gebrochener Parser-Selektor liefern beide `{count: 0, items: []}` mit Status 200.
Über HTTP ist das noch weniger sichtbar als im Skript, weil es nach einer sauberen
Antwort aussieht. Wenn die Route eines Tages 0 Filme meldet: **zuerst den Parser
verdächtigen, nicht den Nutzer.**

**Offene Fragen / Unsicherheiten:**
- Welche Fälle der Nutzer beim Test durchgespielt hat (siehe oben).
- Laufzeit: Der Request scrapt synchron alle Seiten inkl. 300 ms Delay je Seite.
  Bei 236 Filmen sind das mehrere Sekunden. Ob das in einem Deployment (Vercel:
  Function-Timeout) noch trägt, ist nicht geprüft — lokal im Dev-Server fällt es
  nicht auf. Das ist der wahrscheinlichste Bruchpunkt beim ersten Deploy.
- Kein Caching: Jeder Request löst einen kompletten Scrape aus. Bei einem UI, das
  bei jedem Reload lädt, geht das direkt in Letterboxds Rate-Limit-Risiko (das
  ohnehin nicht erprobt ist, siehe 19.07.).

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
