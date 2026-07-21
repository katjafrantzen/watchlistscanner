import {WatchlistItem, TmdbMatch, ProviderInfo, MovieResult } from '@/lib/types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const WATCH_REGION = 'DE'; 

function getAuthHeaders(): HeadersInit {
    const token = process.env.TMDB_READ_ACCESS_TOKEN;
    if (!token) {
        throw new Error("TMDB_READ_ACCESS_TOKEN is not set in environment variables.");
    }
    return {
        accept: 'application/json', Authorization: `Bearer ${token}`
    };
}

export async function searchMovie(title: string, year: number): Promise<TmdbMatch>{
    const encodedTitle = encodeURIComponent(title);
    const url = `${TMDB_BASE_URL}/search/movie?query=${encodedTitle}&include_adult=true&language=en-US&page=1&year=${String(year)}`;
    const options = {
        method: 'GET',
        headers: getAuthHeaders()
    };

    const response = await fetch(url, options);
    if(!response.ok){
        throw new Error(`TMDB search fehlgeschlagen (${response.status}) für "${title}"`);
    }

    const data = await response.json() as {
        results?: Array<{
            id: number;
            title: string;
            poster_path?: string | null;
        }>;
    };

    const firstResult = data.results?.[0];
    if (!firstResult) {
        throw new Error(`Keine TMDB-Ergebnisse gefunden für "${title}" (${year})`);
    }

    return {
        tmdbId: firstResult.id,
        matchedTitle: firstResult.title,
        posterUrl: firstResult.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${firstResult.poster_path}`
            : ''
    };
}

function toProviderInfos(
    providers: Array<{ provider_id: number; provider_name: string }> | undefined,
    type: ProviderInfo['type']
): ProviderInfo[] {
    return (providers ?? []).map(provider => ({
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        type
    }));
}

export async function searchProviders(tmdbId: number): Promise<ProviderInfo[]>{
    const url = `${TMDB_BASE_URL}/movie/${String(tmdbId)}/watch/providers`;
    const options = {
        method: 'GET',
        headers: getAuthHeaders()
    };

    const response = await fetch(url, options);
    if(!response.ok){
        throw new Error(`Provider search fehlgeschlagen (${response.status}) für "${String(tmdbId)}"`);
    }

    // TMDB gruppiert nach Region und darin nach Angebotsart:
    // { results: { DE: { flatrate: [...], rent: [...], buy: [...] } } }
    const data = await response.json() as {
        results?: Record<string, {
            flatrate?: Array<{ provider_id: number; provider_name: string }>;
            rent?: Array<{ provider_id: number; provider_name: string }>;
            buy?: Array<{ provider_id: number; provider_name: string }>;
        }>;
    };

    const region = data.results?.[WATCH_REGION];
    if (!region) {
        return [];
    }

    return [
        ...toProviderInfos(region.flatrate, 'flat'),
        ...toProviderInfos(region.rent, 'rent'),
        ...toProviderInfos(region.buy, 'buy')
    ];
}
