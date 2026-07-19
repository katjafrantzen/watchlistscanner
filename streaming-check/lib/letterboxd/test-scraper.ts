import { scrapeFullWatchlist } from "./scraper";

async function main() {
  const items = await scrapeFullWatchlist("katjafrantzen");
  console.log("Item count:" + items.length);
  if (items.length > 0) {
    console.log(items[items.length - 1].title);
  } else {
    console.log("No items found.");
  }
}

main();