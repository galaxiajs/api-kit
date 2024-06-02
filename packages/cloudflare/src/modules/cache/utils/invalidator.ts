import { cacheHeader } from "pretty-cache-header";
import { url } from "../../request";
import { type TrackedCache, trackedCache } from "./tracked-cache";

type InvalidatorType = "tag" | "path";
type CacheKey = string & { readonly __brand: unique symbol };

export interface Invalidator {
	/**
	 * Add the {@linkcode cacheKey} under the given {@linkcode tags} allowing
	 * the cache key to be invalidated by the given tags.
	 * @param cacheKey
	 * @param tags
	 */
	register(cacheKey: string, tags: string[]): Promise<void>;
	/**
	 * List all registered tags.
	 * @internal
	 */
	keys(): Promise<string[]>;
	/**
	 * Invalidate the given tag
	 * @param tag
	 */
	revalidate(tag: string): Promise<void>;
	/**
	 * @internal
	 * @param cacheKey Key to check if invalidated
	 * @param tags
	 * @returns `true` if the {@linkcode cacheKey} was invalidated by any keys in
	 *          {@linkcode tags}
	 */
	wasInvalidated(cacheKey: string, tags: string[]): Promise<boolean>;
	/**
	 * Mark the given cache key as revalidated (i.e., indicates that it has refetched
	 * the data)
	 * @internal
	 */
	markAsRevalidated(cacheKey: string, tags: string[]): Promise<void>;
}

interface Info {
	/** Cache keys that were registered under this invalidator */
	registered: string[];
	/**
	 * Which of the registered keys needs to be revalidated. This is always a
	 * subset of the registered cache keys.
	 */
	pendingRevalidates: string[];
}

export function createInvalidator(type: InvalidatorType): Invalidator {
	function useCache() {
		return trackedCache(`pulsar:${type}`);
	}

	function createCacheKey(tag: string): CacheKey {
		// It is already a cache key
		if (tag.includes(`/__pulsar/__${type}`)) return tag as CacheKey;
		const cacheUrl = new URL(`/__pulsar/__${type}${tag}`, url().origin);
		return cacheUrl.toString() as CacheKey;
	}

	async function read(key: CacheKey, cache: TrackedCache): Promise<Info> {
		const existing = await cache.match(key);
		if (existing) return await existing.clone().json<Info>();

		return { pendingRevalidates: [], registered: [] };
	}

	async function put(key: CacheKey, info: Info, tagCache: TrackedCache) {
		const response = new Response(JSON.stringify(info), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": cacheHeader({ maxAge: "1y" }),
				"Last-Modified": new Date().toUTCString(),
			},
		});

		await tagCache.put(key, response.clone());
	}

	return {
		async register(cacheKey, tags) {
			if (tags.length === 0) return;

			const cache = await useCache();
			await Promise.all(
				tags.map(async (tag) => {
					const tagKey = createCacheKey(tag);
					const info = await read(tagKey, cache);

					if (!info.registered.includes(cacheKey)) {
						info.registered.push(cacheKey);
					}

					await put(tagKey, info, cache);
				})
			);
		},
		async keys() {
			const cache = await useCache();
			return await cache.keys();
		},
		async revalidate(tag) {
			const cacheKey = createCacheKey(tag);
			const cache = await useCache();
			const info = await read(cacheKey, cache);

			info.pendingRevalidates = info.registered;
			await put(cacheKey, info, cache);
		},
		async wasInvalidated(cacheKey, tags) {
			if (tags.length === 0) return false;

			const cache = await useCache();
			return await Promise.all(
				tags.map(async (tag) => {
					const tagKey = createCacheKey(tag);
					const info = await read(tagKey, cache);
					if (info.pendingRevalidates.includes(cacheKey)) return true;
				})
			).then((m) => m.some(Boolean));
		},
		async markAsRevalidated(cacheKey, tags) {
			if (tags.length === 0) return;

			const cache = await useCache();
			await Promise.all(
				tags.map(async (tag) => {
					const key = createCacheKey(tag);
					const info = await read(key, cache);
					info.pendingRevalidates = info.pendingRevalidates.filter((f) => f !== cacheKey);

					await put(key, info, cache);
				})
			);
		},
	};
}
