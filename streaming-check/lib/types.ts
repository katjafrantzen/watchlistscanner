export interface WatchlistItem {
    letterboxdSlug : string;
    title: string;
    year: number | null;
}

export interface TmdbMatch {
    tmdbId: number;
    matchedTitle: string;
    confidence: number;
    posterUrl: string;
}

export interface ProviderInfo {
    providerName: string;
    providerId: number;
    type: "flat" | "rent" | "buy";
}

export interface MovieResult {
    watchlistItem: WatchlistItem;
    tmdbMatch: TmdbMatch | null;
    providers: ProviderInfo[];
    availableOnUserPlatforms: boolean;
}