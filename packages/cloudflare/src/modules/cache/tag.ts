import { waitUntil } from "../execution-context";
import { createInvalidator } from "./utils/invalidator";

export const tagRevalidator = createInvalidator("tag");

/**
 * Allows you to purge cached data on-demand for a specific cache tag. Note
 * that this will **not** invalidate relevant caches on the current request,
 * only on the next visit.
 *
 * @param tag A string representing the cache tag associated with the data you
 * 						want to revalidate. Must be less than or equal to 256 characters.
 * 						This value is case-sensitive.
 * @returns {void}
 */
export function revalidateTag(tag: string): void {
	waitUntil(tagRevalidator.revalidate(tag));
}
