/**
 * @module
 *
 * Api-Kit - Web Framework built on Web Standards
 *
 * @example
 * ```ts
 * import { cloudflare } from '@galaxiajs/cloudflare-kit';
 *
 * export default cloudflare({
 *   fetch(request) {
 *     return Response.json({ message: 'Api-Kit!' })
 * 	 }
 * })
 * ```
 */

export { createResponse } from "./create-response";
export { cloudflare } from "./handler";
export { inject } from "./inject";
export {
	bindings,
	env,
	locals,
	type $Bindings as Bindings,
	type Env,
	type $Locals as Locals,
	type $Secrets as Secrets,
} from "./modules/env";
export { executionContext, waitUntil } from "./modules/execution-context";
export {
	headers,
	ip,
	method,
	pathname,
	request,
	searchParams,
	url,
} from "./modules/request";
export {
	redirect,
	response,
	status,
	type RedirectStatus,
	type ResponseContext,
} from "./modules/response";
export type {
	CloudflareWorker,
	ExportedWorker,
	Handler,
	MakeAsync,
	Resource,
} from "./types";
