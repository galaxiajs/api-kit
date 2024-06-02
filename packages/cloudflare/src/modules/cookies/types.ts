import { Cookie, type CookieAttributes } from "oslo/cookie";

export interface CookieDeleteOptions extends Pick<CookieAttributes, "domain" | "path"> {}

export interface CookieStore {
	[Symbol.iterator](): IterableIterator<[string, Cookie]>;

	/**
	 * The amount of cookies received from the client
	 */
	readonly size: number;

	/**
	 * @param {string} name
	 * @returns an object with name and value. If a cookie with name isn't found,
	 * it returns undefined. If multiple cookies match, it will only return the
	 * first match.
	 */
	get(name: string): Cookie | undefined;

	/**
	 * Like {@linkcode get}, but allows you to return multiple {@linkcode Cookie}
	 * items.
	 * @param {string[]} names
	 */
	getAll(...names: string[]): Cookie[];

	/**
	 * @param {string} name
	 * @returns a boolean based on if the cookie exists (true) in the request or
	 * not (false).
	 */
	has(name: string): boolean;

	set: {
		/**
		 * Set the outgoing response cookie.
		 *
		 * {@link https://wicg.github.io/cookie-store/#CookieStore-set CookieStore#set}
		 *
		 * @param {Cookie} cookie Setting {@linkcode CookieAttributes.maxAge} to 0 will
		 * immediately expire a cookie. Setting {@linkcode CookieAttributes.expires}
		 * to any value in the past will immediately expire a cookie.
		 * @returns {Cookie}
		 */
		(cookie: Cookie): Cookie;
		/**
		 * Set the outgoing response cookie.
		 *
		 * {@link https://wicg.github.io/cookie-store/#CookieStore-set CookieStore#set}
		 * @param {string} name
		 * @param {string} value If this is an empty string, this method behaves like {@linkcode delete}
		 * @param {CookieAttributes} [attributes] Setting {@linkcode CookieAttributes.maxAge} to 0 will
		 * immediately expire a cookie. Setting {@linkcode CookieAttributes.expires}
		 * to any value in the past will immediately expire a cookie.
		 * @returns {Cookie}
		 */
		(name: string, value: string, attributes?: CookieAttributes): Cookie;
	};
	/**
	 * Explicitly delete the response cookies matching the passed name or names in the
	 * request.
	 *
	 * Note that you can only delete cookies that belong to the same domain from
	 * which {@linkcode set} is called. Additionally, the code must be executed
	 * on the same protocol (HTTP or HTTPS) as the cookie you want to delete.
	 *
	 * {@link https://wicg.github.io/cookie-store/#CookieStore-delete CookieStore#delete}
	 * @param {string} name
	 * @param {CookieDeleteOptions} [options]
	 */
	delete(name: string | string[], options?: CookieDeleteOptions): void;

	toString(): string;
}
