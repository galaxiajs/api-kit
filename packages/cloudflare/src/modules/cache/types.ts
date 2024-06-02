import type { cacheHeader } from "pretty-cache-header";

export type CacheHeaderParams = Parameters<typeof cacheHeader>[0];

export interface DataTransformer {
	/** Serialise the object into a string */
	serialise(object: unknown): string;
	/** Deserialise a string into sn object */
	deserialise(str: string): unknown;
}

export interface CacheOptions<Args extends any[] = any[]> {
	/**
	 * Control how the object is serialised and de-serialised from the cache.
	 * You will need a custom transformer if you want to store things like
	 * dates.
	 *
	 * Defaults to {@linkcode JSON.stringify} for serialisation and
	 * {@linkcode JSON.parse} for de-serialisation.
	 */
	transformer?: DataTransformer;
	/**
	 * The number of seconds after which the cache should be revalidated.
	 * Omit or pass `false` to cache indefinitely or until matching revalidateTag()
	 * or revalidatePath() methods are called.
	 */
	revalidate?: false | number;
	/**
	 * An array of tags that can be used to control cache invalidation. When using
	 * a function, it receives the same arguments as the data fetcher. However,
	 * ensure the returned tag is globally unique, otherwise you may
	 * unintentionally invalidate other caches e.g., a user ID is not great as it
	 * could be used; you can fix this by simply prefixing the user ID with the
	 * action you're performing e.g., `getUser-[USER_ID]`
	 */
	tags?: string[] | ((...args: Args) => string[] | Promise<string[]>);
}

export type DataFetcher<I extends any[] = any[], O = any> = (...args: I) => Promise<O>;
