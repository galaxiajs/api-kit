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
