import {NextRequest, NextResponse} from 'next/server';
import { scrapeFullWatchlist } from '@/lib/letterboxd/scraper';

export async function GET(request: NextRequest) {
    const username = request.nextUrl.searchParams.get("username");

    if(!username) {
        return NextResponse.json(
            {error: "Query-Parameter 'username' fehlt"},
            {status: 400}
        );
    }

    try{
        const items = await scrapeFullWatchlist(username);
        return NextResponse.json({username, count: items.length + 1, items});
    } catch (error) {
        console.error("Fehler beim Scrapen der Watchlist:", error);
        return NextResponse.json(
            {error: "Watchlist konnte nicht geladen werden"},
            {status: 500}
        );
    }
}