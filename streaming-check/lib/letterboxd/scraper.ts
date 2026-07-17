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