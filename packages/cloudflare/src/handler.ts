import type { WorkerEntrypoint } from "cloudflare:workers";
import type { ExportedHandler } from "@cloudflare/workers-types";
import { createResponse } from "./create-response";
import {
	HandlerContext,
	type IHandlerContext,
	LocalsContext,
} from "./modules/context/context";
import { createContext, createLocals } from "./modules/context/utils";
import type { Env } from "./modules/env";
import type { ExportedWorker, Handler, MakeAsync, Promisable } from "./types";

/**
 * @template {Handler<Env>} T
 * @param {T} handler
 * @returns {MakeAsync<T>}
 */
export function cloudflare<T extends Handler<Env>>(handler: T): MakeAsync<T>;
/**
 * @template {typeof import("cloudflare:workers").WorkerEntrypoint<Env>} T
 * @param {T} handler
 * @returns {MakeAsync<T>}
 */
export function cloudflare<T extends typeof WorkerEntrypoint<Env>>(
	handler: T
): MakeAsync<T>;
/**
 * @template {import("@cloudflare/workers-types").ExportedHandler<Env, any, any>} T
 * @param {T} handler
 * @returns {MakeAsync<T>}
 */
export function cloudflare<T extends ExportedHandler<Env, any, any>>(
	handler: T
): MakeAsync<T>;
/**
 * @template {CloudflareWorker<Env>} T
 * @param {T} handler
 * @returns {MakeAsync<T>}
 */
export function cloudflare<T extends ExportedWorker<Env>>(handler: T): MakeAsync<T> {
	if (typeof handler === "function" && "prototype" in handler) {
		const Cls = handler as typeof WorkerEntrypoint<Env>;
		// @ts-expect-error
		return class extends Cls {
			fetch(req: any) {
				return handleRequest(
					createContext(req, this.env, this.ctx),
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					() => super.fetch?.(req)!
				);
			}
		};
	}

	// @ts-expect-error
	return {
		...handler,
		fetch(req: any, cfEnv: any, ctx: any) {
			return handleRequest(
				createContext(req, cfEnv, ctx),
				() =>
					// @ts-expect-error
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					handler.fetch?.(req, cfEnv, ctx)!
			);
		},
	};
}

export function handleRequest(ctx: IHandlerContext, handle: () => Promisable<Response>) {
	return HandlerContext.run(ctx, async () => {
		/** Run locals **after** initial request context so `inject` can access it */
		const injected = await createLocals();
		return await LocalsContext.run(injected, async () => {
			const result = await handle();
			if (result instanceof Response) {
				for (const [key, value] of result.headers.entries()) {
					ctx.response.headers.append(key, value);
				}

				return new Response(result.body, {
					statusText: result.statusText,
					status: result.status,
					headers: ctx.response.headers as unknown as Headers,
					// @ts-expect-error is a CF only type
					cf: result.cf,
					// @ts-expect-error is a CF only type
					webSocket: result.webSocket,
					// @ts-expect-error is a CF only type
					encodeBody: result.encodeBody,
				});
			}

			return createResponse(result, {
				status: ctx.response.status,
				headers: ctx.response.headers as unknown as Headers,
			});
		});
	});
}
