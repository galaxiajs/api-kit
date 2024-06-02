import type { WorkerEntrypoint } from "cloudflare:workers";
import type {
	DurableObject,
	ExecutionContext,
	ExportedHandler,
	KVNamespace,
	Queue,
	R2Bucket,
} from "@cloudflare/workers-types";
import type { Env } from "./modules/env";

export type Promisable<T> = T | Promise<T>;

/** An instantiated Cloudflare worker */
export type CloudflareWorker<T extends object = any> =
	| WorkerEntrypoint<T>
	| ExportedHandler<T, any, any>;

/** A worker exported by the consumer */
export type ExportedWorker<T extends object = any> =
	| ExportedHandler<T, any, any>
	| typeof WorkerEntrypoint<T>;

/**
 * Allows the consumer to specify just the request in
 * the function params without losing type inference
 */
export interface Handler<T extends object = any> {
	fetch(request: Request, env: T, ctx: ExecutionContext): Promisable<any>;
	fetch(request: Request, env: T): Promisable<any>;
	fetch(request: Request): Promisable<any>;
}

export type Constructor<In extends any[] = any[], Out extends object = any> = new (
	...args: In
) => Out;

/**
 * Make methods async and have the full signature of a cloudflare worker
 * in case the consumer wants to invoke it manually e.g., in testing; this
 * includes making all methods return promises if the original definition
 * did not
 */
export type MakeAsync<T> = T extends { fetch(request: any, env: any, ctx: any): any }
	? Omit<T, "fetch"> & {
			fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
		}
	: T extends Constructor<
				infer Args extends any[],
				infer Instance extends WorkerEntrypoint<any>
			>
		? Constructor<
				Args,
				Omit<Instance, "fetch"> & {
					fetch(request: Request): Promise<Response>;
				}
			>
		: T;

export type Resource = CloudflareWorker | R2Bucket | Queue | KVNamespace | DurableObject;
