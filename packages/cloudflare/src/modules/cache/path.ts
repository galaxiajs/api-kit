import { waitUntil } from "../execution-context";
import { createInvalidator } from "./utils/invalidator";

export const pathRevalidator = createInvalidator("path");

/**
 * Allows you to purge cached data on-demand for all cached data on the given
 * path. Multiple paths can be matched using `*` for a single segment and
 * `** /*` for multiple segments.
 *
 * Note that this will **not** invalidate relevant caches on the current
 * request, only on the next visit.
 *
 * @param pathname A string representing the pathname associated with the data
 * 								 you want to revalidate. This value is case-sensitive.
 * @returns {void}
 */
export function revalidatePath(pathname: string): void {
	const regex = createPathnameRegex(pathname);
	waitUntil(
		pathRevalidator.keys().then((keys) =>
			Promise.all(
				keys.map(async (path) => {
					if (regex.test(path)) await pathRevalidator.revalidate(path);
				})
			)
		)
	);
}

function createPathnameRegex(globPattern: string) {
	const regexPattern = globPattern
		// Replace **/* with .*
		.replace(/\*\*\/\*/g, "(.*?)")
		// Replace * with [^/]* to match a single segment
		.replace(/\*/g, "([^/]*)");

	return new RegExp(`${regexPattern}$`);
}
