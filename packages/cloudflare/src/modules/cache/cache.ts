import { cacheHeader } from "pretty-cache-header";
import { waitUntil } from "../execution-context";
import { url, pathname } from "../request";
import { response } from "../response";
import { pathRevalidator } from "./path";
import { tagRevalidator } from "./tag";
import type { CacheHeaderParams, CacheOptions, DataFetcher } from "./types";

/**
 * Convenience method for setting the cache headers of the response.
 * It is based on `pretty-cache-header` which provides an intuitive
 * and natural way to set the cache headers in natural language.
 *
 * **Note: This will not cache responses in the Cloudflare cache - it is
 * only for setting `Cache-Control` headers**
 *
 * @returns {string} The cache header string that was added to the response
 */
export function cache(params: CacheHeaderParams): string {
	const { headers } = response();
	const header = cacheHeader(params);
	headers.set("Cache-Control", header);
	return header;
}

interface Cacheable {
	pathname: string;
	value: any;
	tags: string[];
}

/**
 * Allow you to cache the results of expensive operations, like database queries,
 * and reuse them across multiple requests.
 *
 * Note that this will **not** cache the data for calls in the same
 * request cycle - only on the next visit.
 *
 * @template {DataFetcher} T
 * @param {T} fetchData An asynchronous function that fetches the data you want to cache.
 * 											It must be a function that returns a {@linkcode Promise}.
 * @param {string[]} keyParts An array that identifies the cached key. It
 * 														must contain globally unique values that together
 * 														identify the key of the data being cached. The cache
 * 														key also includes the arguments passed to the function.
 * @param {CacheOptions} options
 * @returns {T} A function that when invoked, returns a {@linkcode Promise} that
 * resolves to the cached data. If the data is not in the cache, the provided
 * function will be invoked, and its result will be cached and returned.
 */
export function cached<T extends DataFetcher>(
	fetchData: T,
	keyParts: string[],
	{ transformer, revalidate = false, tags = [] }: CacheOptions<Parameters<T>> = {}
): T {
	if (revalidate === 0) {
		throw new Error(
			`Invariant revalidate: 0 can not be passed to cached(), must be "false" or "> 0" ${fetchData.toString()}`
		);
	}

	const { serialise, deserialise } = transformer ?? {
		serialise: JSON.stringify,
		deserialise: JSON.parse,
	};

	const cacheControl = cacheHeader({
		maxAge:
			typeof revalidate !== "number"
				? "1y"
				: // https://www.ietf.org/rfc/rfc2616.txt
					`${revalidate}s`,
	});

	// @ts-expect-error
	return async function useCache(...args: Parameters<T>) {
		const cacheKey = createCacheKey([...keyParts, ...args]);
		const cachePath = pathname();
		const cacheTags = typeof tags === "function" ? await tags(...args) : tags;

		const invalidated =
			(await tagRevalidator.wasInvalidated(cacheKey, cacheTags)) ||
			(await pathRevalidator.wasInvalidated(cacheKey, [cachePath]));

		const registerPromise = Promise.all([
			tagRevalidator.register(cacheKey, cacheTags),
			pathRevalidator.register(cacheKey, [cachePath]),
		]);

		const cache = await caches.open("api-kit:cache");
		const existing = await cache.match(cacheKey);
		if (existing) {
			const parsed: Cacheable = await deserialise(await existing.clone().text());
			if (invalidated) await cache.delete(cacheKey);
			else {
				waitUntil(registerPromise);
				return parsed.value;
			}
		}

		const fresh = await fetchData(...args);
		const toCache = new Response(
			serialise({
				value: fresh,
				tags: cacheTags,
				pathname: cachePath,
			} satisfies Cacheable),
			{
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": cacheControl,
					"Last-Modified": new Date().toUTCString(),
				},
			}
		);

		waitUntil(
			registerPromise.then(() =>
				Promise.all([
					tagRevalidator.markAsRevalidated(cacheKey, cacheTags),
					pathRevalidator.markAsRevalidated(cacheKey, [cachePath]),
					cache.put(cacheKey, toCache.clone()),
				])
			)
		);

		return fresh;
	};
}

function createCacheKey(parts: any[]) {
	const { origin, pathname } = url();
	const cacheUrl = new URL(`/__api-kit/__cache__${pathname}`, origin);
	for (const key of parts) cacheUrl.searchParams.append("key", key);

	return cacheUrl.toString();
}
