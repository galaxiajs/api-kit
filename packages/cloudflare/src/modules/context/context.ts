import { AsyncLocalStorage } from "node:async_hooks";
import type { ExecutionContext, Request } from "@cloudflare/workers-types";
import type { $Bindings, $Secrets, Locals } from "../env";
import type { ResponseContext } from "../response";

export interface IHandlerContext {
	readonly request: Request;
	readonly env: $Secrets;
	readonly executionContext: ExecutionContext;
	readonly url: URL;
	readonly bindings: $Bindings;
	readonly response: ResponseContext;
}

export const HandlerContext = new AsyncLocalStorage<IHandlerContext>();
export const LocalsContext = new AsyncLocalStorage<Locals>();

export function useHandlerContext(): IHandlerContext {
	const ctx = HandlerContext.getStore();
	if (!ctx)
		throw new Error(
			"Could not find handler context. Are you calling this at the module level?"
		);
	return ctx;
}
