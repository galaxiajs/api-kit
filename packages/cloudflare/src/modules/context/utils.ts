import type {
	Headers as CfHeaders,
	Request as CfRequest,
	ExecutionContext,
} from "@cloudflare/workers-types";
import { handleRequest } from "src/handler";
import { initialisers } from "src/inject";
import type { Promisable } from "src/types";
import type { $Locals, Env, Locals } from "../env";
import { HandlerContext, type IHandlerContext, LocalsContext } from "./context";

/**
 * Manually create the internal context use by Api Kit. Useful for unit testing.
 */
export function createContext(
	req: CfRequest | Request,
	cfEnv: Env,
	ctx: ExecutionContext
): Readonly<IHandlerContext> {
	const responseHeaders = new Headers();
	const services: Record<string, any> = {};
	const secrets: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(cfEnv)) {
		if (typeof value === "object" || typeof value === "function") {
			services[key] = value;
		} else {
			secrets[key] = value;
		}
	}

	let resStatus = 200;

	return Object.freeze<IHandlerContext>({
		get request() {
			return req as any;
		},
		get env() {
			return Object.freeze(secrets);
		},
		get executionContext() {
			return ctx;
		},
		get url() {
			return new URL(req.url);
		},
		get bindings() {
			return Object.freeze(services);
		},
		get response() {
			return Object.freeze({
				get status() {
					return resStatus;
				},
				set status(statusCode: number) {
					resStatus = statusCode;
				},
				get headers() {
					return responseHeaders as unknown as CfHeaders;
				},
			});
		},
	});
}

/**
 * Manually create the `Locals` object. Useful for unit testing.
 */
export async function createLocals(): Promise<$Locals> {
	const all = await Promise.all(initialisers.map((cb) => cb()));
	const injected = Object.assign({}, ...all);
	return injected;
}

/**
 * Run a callback in the context so the utility methods are available, returning
 * the returned value from the callback. Useful for unit testing.
 */
export function withContext<T>(ctx: IHandlerContext, cb: () => T): T {
	return HandlerContext.run(ctx, cb);
}

/**
 * Run a callback in the context so the `locals` method is available,
 * returning the returned value from the callback. Useful for unit testing.
 */
export function withLocals<T>(ctx: Locals, cb: () => T): T {
	return LocalsContext.run(ctx, cb);
}

export interface WithRequestHandlerOptions {
	request: Request | CfRequest;
	context: ExecutionContext;
	env: Env;
}

/**
 * Run a callback in the context so the utility methods are available, returning
 * the returned value from the callback. Useful for unit testing.
 */
export function withRequestHandler(
	{ request, context, env }: WithRequestHandlerOptions,
	cb: () => Promisable<Response>
): Promise<Response> {
	const ctx = createContext(request, env, context);
	return handleRequest(ctx, cb);
}
