import type { WorkerEntrypoint } from "cloudflare:workers";
import { type MockInstance, type Mocked, vi } from "vitest";

export type Methods<T extends object> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type MockedService<T extends WorkerEntrypoint, M extends keyof T> = {
	[K in keyof T]: K extends M ? Mocked<T[K]> : T[K];
};

/**
 * Spy on a {@linkcode WorkerEntrypoint} function. This is useful when you
 * want to mock calls to service bindings
 *
 * @template {WorkerEntrypoint} T
 * @template {Methods<Required<T>>} M
 * @param {Service<T>}  obj The service containing the function to be spied.
 * @param {M} methodName
 * @returns The mock method.
 */
export function spyOn<T extends WorkerEntrypoint, M extends Methods<Required<T>>>(
	obj: Service<T>,
	methodName: M
): Required<T>[M] extends
	| {
			new (...args: infer A): infer R;
	  }
	// biome-ignore lint/suspicious/noRedeclare: <explanation>
	| ((...args: infer A) => infer R)
	? MockInstance<A, R>
	: never {
	const service: any = obj;
	const value = service[methodName];

	if (typeof value === "function") {
		const originalImpl = service[methodName];
		const mockFn = vi.fn();
		mockFn.bind(obj);

		const restoreMock = mockFn.mockRestore.bind(mockFn);
		mockFn.mockRestore = () => {
			restoreMock();
			service[methodName] = originalImpl;
		};

		service[methodName] = mockFn;
		return mockFn as any;
	}

	throw new Error(`${String(methodName)} is not a function`);
}

/**
 * Mock multiple methods of a {@linkcode WorkerEntrypoint}.
 *
 * @template {WorkerEntrypoint} T
 * @template {Methods<Required<T>>} S
 * @param {Service<T>} service The service containing the function to be spied.
 * @param {S} methodNames
 * @returns {MockedService<T, S>} The service with the corresponding methods mocked.
 */
export function useMockService<
	T extends WorkerEntrypoint,
	S extends Methods<Required<T>>,
>(service: Service<T>, methodNames: S[]): MockedService<T, S> {
	for (const key of methodNames) {
		spyOn(service, key);
	}

	return service as any;
}
