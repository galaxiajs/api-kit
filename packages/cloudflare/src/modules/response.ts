import type { Response as CfResponse } from "@cloudflare/workers-types";
import { useHandlerContext } from "./context";

export interface ResponseContext extends Pick<CfResponse, "status" | "headers"> {}

export type RedirectStatus = 300 | 301 | 302 | 303 | 307 | 308 | 309;

/**
 * @returns {ResponseContext} Readonly information about the response
 */
export function response(): ResponseContext {
	const { response } = useHandlerContext();
	return response;
}

/**
 * Set the response status. This will only take affect where you do not
 * return a {@linkcode Response} object. Returning a response instance
 * bypasses this.
 * @param {number} statusCode
 * @returns {void}
 */
export function status(statusCode: number): void {
	const ctx = useHandlerContext();
	// @ts-expect-error
	ctx.response.status = statusCode;
}

/**
 * Redirect to a new path. This sets the response status code and the
 * `Location` header.
 *
 * The `redirect()` method uses a 307 by default, instead of a `302`
 * temporary redirect, meaning your requests will always be preserved
 * as `POST` requests.
 *
 * @param {string | URL} path The path to redirect to.
 * @param {string} statusCode The status code to use. Defaults to 307.
 */
export function redirect(path: string | URL, statusCode: RedirectStatus = 307): void {
	status(statusCode);
	response().headers.set("Location", path.toString());
}
