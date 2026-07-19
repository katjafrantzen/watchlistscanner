import * as cheerio from 'cheerio';
import { WatchlistItem } from '@/lib/types';


//parsed EINE seite der Watchlist Film fuer Film in eine Liste aus WatchlistItems
export function parseWatchlistPage(html: string): WatchlistItem[] {
    const $ = cheerio.load(html);
    const items: WatchlistItem[] = [];

    $('[data-component-class="LazyPoster"]').each((_,element) => {
        const slug = $(element).attr('data-item-slug');
        const name = $(element).attr('data-item-name');
        let title: string | undefined = undefined;
        let year: number | undefined = undefined;
        
        if (name === undefined || slug === undefined) {
            console.warn('Konnte Item nicht parsen:', {slug, name});
            return;
        }

        //titel und jahr trennen
        const match = name.match(/^(.+)\s\((\d{4})\)$/);
        if (match) {
            title = match[1];
            year = parseInt(match[2], 10);
        }

        if (title === undefined || year === undefined){
            return;
        }

        const item: WatchlistItem = {
            letterboxdSlug: slug,
            title: title,
            year: year,
        };

        items.push(item);

    })

    return items;
}

export async function fetchWatchlistPage(username: string, page: number): Promise<string>{

    //url zusammenbauen
    const url = `https://letterboxd.com/${username}/watchlist/page/${page}/`;

    //inhalt aus url abfragen
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    });

    //checken, ob die antwort valide ist
    if (!response.ok) {
        throw new Error(`Failed to fetch watchlist page ${page} for ${username}: ${response.status}`);
    }

    const html = await response.text();
    return html;
}

const MAX_PAGES = 50;
const DELAY_MS = 300;

function delay(ms: number): Promise<void>{
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeFullWatchlist(username: string): Promise<WatchlistItem[]>{
    const allItems: WatchlistItem[] = [];
    let page = 1;

    while( page <= MAX_PAGES) {
        const html = await fetchWatchlistPage(username, page);
        const items = parseWatchlistPage(html);

        if(items.length === 0){
            break;
        }

        allItems.push(...items);
        page++;

        if(items.length > 0){
            await delay(DELAY_MS);
        }
    }
    return allItems;
}