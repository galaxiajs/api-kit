import type {
	Headers as CfHeaders,
	ExecutionContext,
	Request,
} from "@cloudflare/workers-types";
import { initialisers } from "src/inject";
import type { $Locals, Env, Locals } from "../env";
import { HandlerContext, type IHandlerContext, LocalsContext } from "./context";

export function createContext(
	req: Request,
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

export async function createLocals(): Promise<$Locals> {
	const all = await Promise.all(initialisers.map((cb) => cb()));
	const injected = Object.assign({}, ...all);
	return injected;
}

export function withContext<T>(ctx: IHandlerContext, cb: () => T): T {
	return HandlerContext.run(ctx, cb);
}

export function withLocals<T>(ctx: Locals, cb: () => T): T {
	return LocalsContext.run(ctx, cb);
}
