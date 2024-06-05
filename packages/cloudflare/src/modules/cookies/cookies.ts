import { isWithinExpirationDate } from "oslo";
import { Cookie, type CookieAttributes, parseCookies } from "oslo/cookie";
import parseSetCookie from "set-cookie-parser";
import { headers } from "../request";
import { response } from "../response";
import type { CookieStore } from "./types";

/**
 * Utility allowing you to read the HTTP incoming request cookies or write
 * outgoing request cookies
 * @returns {CookieStore} Cookie handler
 */
export function cookies(): CookieStore {
	const headersList = headers();
	const cookieHeader = headersList.get("Cookie") ?? "";
	const cookieValuesByName = parseCookieHeader(cookieHeader.replace(/;$/, ""));

	const cookieMap = new Map<string, Cookie>();
	const responseHeaders = response().headers;

	for (const [name, value] of cookieValuesByName.entries()) {
		const cookie = new Cookie(name, value, {});
		cookieMap.set(name, cookie);
		responseHeaders.append("Set-Cookie", cookie.serialize());
	}

	function updateResponseCookiesFromMap() {
		const cookieHeader = responseHeaders.get("Set-Cookie") ?? "";
		const responseCookies = parseSetCookieHeader(cookieHeader);

		/** Add any extra set-cookie headers that were added during the request by the consumer */
		responseCookies.forEach((cookie, name) => {
			if (!cookieMap.has(name)) cookieMap.set(name, cookie);
		});

		responseHeaders.delete("Set-Cookie");

		for (const [name, cookie] of cookieMap.entries()) {
			if (isCookieDeleted(cookie)) cookieMap.delete(name);
			responseHeaders.append("Set-Cookie", cookie.serialize());
		}
	}

	updateResponseCookiesFromMap();

	return Object.freeze<CookieStore>({
		[Symbol.iterator]() {
			return cookieMap[Symbol.iterator]();
		},

		get size() {
			return cookieMap.size;
		},

		get(name: string) {
			return cookieMap.get(name);
		},

		getAll(...names) {
			if (names.length) {
				return [...cookieMap.values()].flatMap((c) => {
					if (names.includes(c.name)) return c;
					return [];
				});
			}

			return [...cookieMap.values()];
		},

		has(name) {
			return cookieMap.has(name);
		},

		// @ts-expect-error
		set(...args: [Cookie] | [string, string, CookieAttributes]): Cookie {
			const c = args.length === 1 ? args[0] : new Cookie(args[0], args[1], args[2] ?? {});
			cookieMap.set(c.name, c);
			updateResponseCookiesFromMap();

			return c;
		},

		delete(name, options): void {
			const cookiesToDelete = Array.isArray(name) ? name : [name];

			for (const cookieName of cookiesToDelete) {
				const cookie = cookieMap.get(cookieName);
				if (!cookie) continue;

				const matches = options
					? cookie.attributes.domain === options.domain &&
						cookie.attributes.path === options.path
					: true;

				if (matches) {
					cookie.attributes.maxAge = 0;
				}
			}

			updateResponseCookiesFromMap();
		},

		toString(): string {
			return [...cookieMap.values()]
				.map((v) => `${v.name}=${encodeURIComponent(v.value)}`)
				.join(", ");
		},
	});
}

export function isCookieDeleted({ attributes }: Cookie): boolean {
	return (
		attributes.maxAge === 0 ||
		(!!attributes.expires && !isWithinExpirationDate(attributes.expires))
	);
}

export function parseCookieHeader(cookieHeader: string): Map<string, string> {
	try {
		return parseCookies(cookieHeader.trim());
	} catch (error) {
		if (error instanceof URIError) {
			return new Map<string, string>();
		}

		/* istanbul ignore next */
		throw error;
	}
}

export function parseSetCookieHeader(header: string): Map<string, Cookie> {
	const split = parseSetCookie.splitCookiesString(header.trim());
	const parsedCookies = parseSetCookie(split);
	const cookies = new Map(
		parsedCookies.map(({ name, value, sameSite, ...attributes }) => {
			const same = sameSite?.toLowerCase();
			return [
				name,
				new Cookie(name, value, {
					...attributes,
					sameSite:
						same === "lax"
							? "lax"
							: same === "none"
								? "none"
								: same === "strict"
									? "strict"
									: undefined,
				}),
			] as const;
		})
	);

	return cookies;
}
