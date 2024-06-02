import type { WorkerEntrypoint } from "cloudflare:workers";
import type { Constructor, Resource } from "src/types";
import { LocalsContext, useHandlerContext } from "./context";

/** Injected at runtime using `inject()` */
export interface Locals {}
/** For secrets/environment variables only */
export interface Secrets {}
/** Service bindings */
export interface Bindings {}

export type $Bindings = {
	[K in keyof Env as Env[K] extends Resource ? K : never]: Env[K] extends WorkerEntrypoint
		? Service<Env[K]>
		: // Allow if consumer mistakenly puts e.g., typeof MyService in their types
			Env[K] extends Constructor<infer _, infer Instance extends WorkerEntrypoint<any>>
			? Service<Instance>
			: Env[K];
};

export type $Secrets = {
	[K in keyof Secrets as Secrets[K] extends Resource ? never : K]: Secrets[K];
};

export type $Locals = {
	[K in keyof Locals as Locals[K] extends Resource ? never : K]: Locals[K];
};

export type Env = Bindings & Secrets;

/**
 * @returns {$Secrets} The current {@linkcode Secrets} object
 */
export function env(): $Secrets {
	const { env } = useHandlerContext();
	return env;
}

/**
 * @returns {$Bindings} The current {@linkcode Bindings} object
 */
export function bindings(): $Bindings {
	const { bindings } = useHandlerContext();
	return bindings;
}

/**
 * @returns {$Locals} Your runtime-injected {@linkcode Locals} object
 */
export function locals(): $Locals {
	const ctx = LocalsContext.getStore();
	if (!ctx)
		throw new Error(
			"Could not find locals context. Are you calling locals() at the module level?"
		);
	return ctx;
}
