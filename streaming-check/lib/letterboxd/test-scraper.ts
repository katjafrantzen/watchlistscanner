import { fetchWatchlistPage } from "./scraper";

async function main() {
  const html = await fetchWatchlistPage("katjafrantzen", 1);
  console.log("HTML length:", html.length);
  console.log(html.slice(0, 500)); // erste 500 Zeichen zum Reinschauen
}

main();