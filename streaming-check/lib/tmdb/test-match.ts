import { searchMovie } from "./match";

const CASES: Array<[string, number]> = [
  ["Last Night in Soho", 2021],
  ["Dune", 2021],
  ["Ein Film, den es nicht gibt xyzzy", 1999],
];

async function main() {
  for (const [title, year] of CASES) {
    try {
      const match = await searchMovie(title, year);
      console.log(`OK   "${title}" (${year}) ->`, match);
    } catch (error) {
      console.log(`FAIL "${title}" (${year}) ->`, (error as Error).message);
    }
  }
}

main();
