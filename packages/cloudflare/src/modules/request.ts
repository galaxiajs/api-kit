import type { Headers as CfHeaders, Request } from "@cloudflare/workers-types";
import { useHandlerContext } from "./context";

/**
 * @returns {import("@cloudflare/workers-types").Request} A clone of
 * the current {@linkcode Request}
 */
export function request(): Request {
	const { request } = useHandlerContext();
	return request.clone();
}

/**
 * Allows you to read the HTTP incoming request headers.
 * @returns {import("@cloudflare/workers-types").Headers}
 */
export function headers(): CfHeaders {
	const { headers } = request();
	return headers;
}

/**
 * @returns {string} The current request's HTTP method (uppercase)
 */
export function method(): string {
	const { method } = request();
	return method.toUpperCase();
}

/**
 * @returns {string | null}
 */
export function ip(): string | null {
	const headersList = headers();
	const ip = headersList.get("cf-connecting-ip");
	if (ip) return ip;

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For */
	const forwardedFor = headersList.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0];

	return headersList.get("x-real-ip");
}

/**
 * @returns {URL} The current request {@linkcode URL}
 */
export function url(): URL {
	const { url } = useHandlerContext();
	return url;
}

/**
 * A hook that lets you read the current URL's pathname.
 * @returns {string} The current request URL's pathname
 */
export function pathname(): string {
	return url().pathname;
}

/**
 * Hook that lets you read the current URL's query string.
 * @returns {URLSearchParams} Query params of the current request
 */
export function searchParams(): URLSearchParams {
	return url().searchParams;
}
