export interface Watchlistitem {
    letterboxdSlug : string;
    title: string;
    year: number | null;
}

export interface TmdbMatch {
    tmdbId: number;
    matchedTitle: string;
    confidence: number;
}

export interface ProviderInfo {
    providerName: string;
    providerId: number;
    type: "flat" | "rent" | "buy";
}

export interface MovieResult {
    watchlistItem: Watchlistitem;
    tmdbMatch: TmdbMatch | null;
    providers: ProviderInfo[];
    availableOnUserPlatforms: boolean;
}