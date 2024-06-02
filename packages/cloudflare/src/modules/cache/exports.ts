/**
 * @module
 *
 * Pulsar - Web Framework built on Web Standards
 *
 * @example
 * ```ts
 * import { cloudflare } from '@galaxiajs/cloudflare-kit';
 * import { cached, revalidateTag } from '@galaxiajs/cloudflare-kit/cache';
 *
 * const getCachedUsers = cached(async () => [], ['users'], { tags: ['users'] })
 * export default cloudflare({
 *   fetch(request) {
 * 		 if (SOME_CONDITION) {
 * 				revalidateTag('users')
 * 		 }
 *     return Response.json({ users: await getCachedUsers() })
 * 	 }
 * })
 * ```
 */
export {
	cache,
	cached,
} from "./cache";
export { revalidateTag } from "./tag";
export { revalidatePath } from "./path";
export type {
	CacheHeaderParams,
	CacheOptions,
	DataFetcher,
	DataTransformer,
} from "./types";
