interface CacheEntry {
    content: string;
    timestamp: number;
    url: string;
}

export class URLContentCache {
    private static instance: URLContentCache;
    private cache: Map<string, CacheEntry>;
    private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    private constructor() {
        this.cache = new Map();
    }

    public static getInstance(): URLContentCache {
        if (!URLContentCache.instance) {
            URLContentCache.instance = new URLContentCache();
        }
        return URLContentCache.instance;
    }

    public set(url: string, content: string): void {
        this.cache.set(url, {
            content,
            timestamp: Date.now(),
            url
        });
    }

    public get(url: string): string | null {
        const entry = this.cache.get(url);
        if (!entry) return null;

        const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION_MS;
        if (isExpired) {
            this.cache.delete(url);
            return null;
        }

        return entry.content;
    }

    public clear(): void {
        this.cache.clear();
    }

    public prune(): void {
        const now = Date.now();
        for (const [url, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_DURATION_MS) {
                this.cache.delete(url);
            }
        }
    }
}