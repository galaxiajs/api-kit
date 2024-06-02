import type { z } from "zod";

/**
 * Run a callback that runs on the
 *
 * Note that the input will still be parsed with the schema before being passed
 * to the callback function
 */
export function zod<TSchema extends z.ZodType, TReturn>(
	schema: TSchema,
	callback: (value: z.infer<TSchema>) => TReturn
): (input: z.input<TSchema>) => TReturn {
	const result = (input: any) => {
		const parsed = schema.parse(input);
		return callback(parsed);
	};

	return result;
}
