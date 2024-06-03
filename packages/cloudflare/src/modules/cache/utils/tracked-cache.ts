import type { Cache } from "@cloudflare/workers-types";
import { cacheHeader } from "pretty-cache-header";
import { url } from "../../request";

export type TrackedCache = Awaited<ReturnType<typeof trackedCache>>;

/**
 * Utility to create a {@linkcode Cache} that implements the
 * {@linkcode Cache.keys} method, using another cache to track keys as the
 * Cloudflare cache does not implement the method.
 *
 * @internal
 * @param {string} name
 */
export async function trackedCache(name: string) {
	const { origin } = url();
	const KEY = new URL("/__api-kit/__keys", origin);

	/** Cache for tracking keys */
	const keysCache = await caches.open(`${name}:keys`);
	/** Cache for consumer */
	const cache = await caches.open(name);

	async function getKeys(): Promise<string[]> {
		const response = await keysCache.match(KEY);
		if (!response) return [];

		const list = await response.json<string[]>();
		if (Array.isArray(list)) return list;
		return [];
	}

	async function updateKeys(keys: string[]) {
		await keysCache.put(
			KEY,
			new Response(JSON.stringify(keys), {
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": cacheHeader({ maxAge: "1y" }),
				},
			})
		);
	}

	function keyToString(request: URL | RequestInfo): string {
		return typeof request === "object" && "url" in request
			? request.url
			: request.toString();
	}

	return {
		match(
			request: URL | RequestInfo,
			options?: CacheQueryOptions
		): Promise<Response | undefined> {
			return cache.match(request, options);
		},
		async put(request: URL | RequestInfo, response: Response): Promise<void> {
			const strKey = keyToString(request);
			const keys = await getKeys();
			if (!keys.includes(strKey)) {
				keys.push(strKey);
				await updateKeys(keys);
			}

			return await cache.put(request, response);
		},
		keys(): Promise<string[]> {
			return getKeys();
		},
	};
}
