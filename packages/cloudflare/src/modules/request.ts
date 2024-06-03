import type {
	Headers as CfHeaders,
	Request as CfRequest,
} from "@cloudflare/workers-types";
import { useHandlerContext } from "./context/context";

/**
 * @template {Request | CfRequest} T Optional cast if you need the standard `Request` type
 * @returns {import("@cloudflare/workers-types").Request} A clone of
 * the current {@linkcode Request}
 */
export function request<T extends Request | CfRequest = CfRequest>(): T {
	const { request } = useHandlerContext();
	return request.clone() as unknown as T;
}

/**
 * Allows you to read the HTTP incoming request headers.
 * @template {Headers | CfHeaders} T Optional cast if you need the standard `Headers` type
 * @returns {import("@cloudflare/workers-types").Headers}
 */
export function headers<T extends Headers | CfHeaders = CfHeaders>(): T {
	const { headers } = request();
	return headers as unknown as T;
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
