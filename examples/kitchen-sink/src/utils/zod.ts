import type { Hook } from "@hono/zod-validator";

/**
 * For use with `zValidator` as by default it doesn't throw the error
 * (meaning we can't handle it ourselves)
 */
export function throwOnValidationError<T, Env extends object, Res extends string>(): Hook<
	T,
	Env,
	Res
> {
	return (result) => {
		if (!result.success) {
			throw result.error;
		}
	};
}
