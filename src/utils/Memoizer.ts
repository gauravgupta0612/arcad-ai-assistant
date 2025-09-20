interface MemoizedEntry<T> {
    value: T;
    timestamp: number;
}

export class Memoizer<K, V> {
    private cache: Map<K, MemoizedEntry<V>>;
    private readonly duration: number;

    constructor(durationMs: number = 5 * 60 * 1000) { // Default: 5 minutes
        this.cache = new Map();
        this.duration = durationMs;
    }

    public memoize(fn: (key: K) => V): (key: K) => V {
        return (key: K): V => {
            const entry = this.cache.get(key);
            const now = Date.now();

            if (entry && now - entry.timestamp < this.duration) {
                return entry.value;
            }

            const value = fn(key);
            this.cache.set(key, { value, timestamp: now });
            return value;
        };
    }

    public clear(): void {
        this.cache.clear();
    }

    public prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.duration) {
                this.cache.delete(key);
            }
        }
    }
}

interface AsyncMemoizedEntry<T> {
    promise: Promise<T>;
    timestamp: number;
}

export class AsyncMemoizer<K, V> {
    private cache: Map<K, AsyncMemoizedEntry<V>>;
    private readonly duration: number;

    constructor(durationMs: number = 5 * 60 * 1000) { // Default: 5 minutes
        this.cache = new Map();
        this.duration = durationMs;
    }

    public memoize(fn: (key: K) => Promise<V>): (key: K) => Promise<V> {
        return async (key: K): Promise<V> => {
            const entry = this.cache.get(key);
            const now = Date.now();

            if (entry && now - entry.timestamp < this.duration) {
                return entry.promise;
            }

            const promise = fn(key);
            this.cache.set(key, { promise, timestamp: now });
            return promise;
        };
    }

    public clear(): void {
        this.cache.clear();
    }

    public prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.duration) {
                this.cache.delete(key);
            }
        }
    }
}