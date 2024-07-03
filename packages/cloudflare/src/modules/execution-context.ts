import type { ExecutionContext } from "@cloudflare/workers-types";
import { useHandlerContext } from "./context/context";

/**
 * @returns {import("@cloudflare/workers-types").ExecutionContext} The current {@linkcode ExecutionContext}
 */
export function executionContext(): ExecutionContext {
	const { executionContext } = useHandlerContext();
	return executionContext;
}

/**
 * Shorthand for {@linkcode ExecutionContext.waitUntil}. Takes a promise as an
 * argument, and extends the lifetime of processing until the promise settles.
 * This is useful for performing work in the background without affecting
 * response times
 *
 * @param {Promise<any>} promise
 * @returns {void}
 */
export function waitUntil(promise: Promise<any>): void {
	const ctx = executionContext();
	ctx.waitUntil(promise);
}

export const afters: Array<() => any> = [];

/**
 * Allows you to schedule work to be executed after a response is finished.
 * This is useful for tasks and other side effects that should not block
 * the response, such as logging and analytics.
 *
 * Unlike {@linkcode waitUntil}, this will run _after_ the response has turned,
 * rather than being kicked off concurrently during the request cycle.
 *
 * `after()` will be executed even if the response didn't complete successfully,
 * including when an error is thrown or when `redirect()` is called.
 *
 * Note that you cannot:
 *
 * - Set cookies
 * - Modify response headers
 * - Modify response status
 *
 * Inside `after()` as the response will have already been sent. Doing any of these
 * will throw a Cloudflare error.
 *
 * @param {() => any} callback A function that will be executed after the response is finished.
 * @returns {void}
 */
export function after(callback: () => any): void {
	afters.push(callback);
}
