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
 * Shorthand for {@linkcode ExecutionContext.waitUntil}
 * @param {Promise<any>} promise
 * @returns {void}
 */
export function waitUntil(promise: Promise<any>): void {
	const ctx = executionContext();
	ctx.waitUntil(promise);
}
