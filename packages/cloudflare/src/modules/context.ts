import { AsyncLocalStorage } from "node:async_hooks";
import type {
	Headers as CfHeaders,
	ExecutionContext,
	Request,
} from "@cloudflare/workers-types";
import { initialisers } from "src/inject";
import type { $Bindings, $Secrets, Env, Locals } from "./env";
import type { ResponseContext } from "./response";

export interface HandlerContext {
	readonly request: Request;
	readonly env: $Secrets;
	readonly executionContext: ExecutionContext;
	readonly url: URL;
	readonly bindings: $Bindings;
	readonly response: ResponseContext;
}

export const HandlerContext = new AsyncLocalStorage<HandlerContext>();
export const LocalsContext = new AsyncLocalStorage<Locals>();

export function useHandlerContext(): HandlerContext {
	const ctx = HandlerContext.getStore();
	if (!ctx)
		throw new Error(
			"Could not find handler context. Are you calling this at the module level?"
		);
	return ctx;
}

export function createContext(
	req: Request,
	cfEnv: Env,
	ctx: ExecutionContext
): Readonly<HandlerContext> {
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

	return Object.freeze<HandlerContext>({
		get request() {
			return req;
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

export async function createLocals() {
	const all = await Promise.all(initialisers.map((cb) => cb()));
	const injected = Object.assign({}, ...all);
	return injected as Locals;
}
