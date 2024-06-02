import type { $Locals } from "./modules/env";
import type { Promisable } from "./types";

type Inject = Partial<$Locals>;

export const initialisers: Array<() => Inject> = [];

/**
 * Declare things to initialise on every request (e.g., database connection etc.).
 * You can call this many times to define your locals across separate files if needed.
 *
 * You should keep things lightweight here as they will run on _every_ request.
 *
 * Note that you will not have access to other `Locals`, but you will have access
 * to all other context methods. If you need access to other locals, you should
 * build them all in the same `inject` call.
 * @param {() => Promise<Inject>} callback
 */
export function inject(callback: () => Promise<Inject>): void;
/**
 * Declare things to initialise on every request (e.g., database connection etc.).
 * You can call this many times to define your locals across separate files if needed.
 *
 * You should keep things lightweight here as they will run on _every_ request.
 *
 * Note that you will not have access to other `Locals`, but you will have access
 * to all other context methods. If you need access to other locals, you should
 * build them all in the same `inject` call.
 * @param {() => Inject} callback
 */
export function inject(callback: () => Inject): void;
/**
 * Declare things to initialise on every request (e.g., database connection etc.).
 * You can call this many times to define your locals across separate files if needed.
 *
 * You should keep things lightweight here as they will run on _every_ request.
 *
 * Note that you will not have access to other `Locals`, but you will have access
 * to all other context methods. If you need access to other locals, you should
 * build them all in the same `inject` call.
 * @param {() => Promisable<Inject>} callback
 */
export function inject(callback: () => Promisable<Inject>): void {
	initialisers.push(callback);
}
