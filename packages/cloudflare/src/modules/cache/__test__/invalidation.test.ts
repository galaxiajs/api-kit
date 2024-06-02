import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { cloudflare } from "src/handler";
import { cached } from "src/modules/cache/cache";
import { method, pathname } from "src/modules/request";
import { describe, expect, test, vi } from "vitest";
import { revalidatePath } from "../path";
import { revalidateTag } from "../tag";

const URL = "https://example.com";

describe("cache invalidation", () => {
	test("should throw error when passing a revalidation of 0 seconds", () => {
		expect(() => cached(vi.fn(), ["getUser"], { revalidate: 0 })).toThrowError(
			/^Invariant revalidate: 0 can not be passed to cached\(\), must be "false" or "> 0"/
		);
	});

	test("should invalidate a tag and leave other caches unchanged", async () => {
		const getUserSpy = vi.fn();
		const listUserSpy = vi.fn().mockResolvedValue([]);

		const getCachedUser = cached(getUserSpy, ["getUser"], { tags: ["user"] });
		const listCachedUsers = cached(listUserSpy, ["users"], { tags: ["users"] });

		const worker = cloudflare({
			async fetch() {
				if (pathname() === "/users") return await listCachedUsers();
				if (method() === "GET") return await getCachedUser();
				revalidateTag("user");
			},
		});

		// Populate getCachedUser cache
		const ctx = createExecutionContext();
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).not.toHaveBeenCalled();

		// Assert getCachedUser cache was hit
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).not.toHaveBeenCalled();

		// Populate listCachedUsers cache
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(listUserSpy).toHaveBeenCalledOnce();
		expect(getUserSpy).toHaveBeenCalledOnce();

		// Assert listCachedUsers cache was hit
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).toHaveBeenCalledOnce();

		/** Invalidate getCachedUser cache */
		await worker.fetch(new Request(`${URL}/users/123`, { method: "POST" }), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).toHaveBeenCalledOnce();

		// Assert getCachedUser cache miss
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledTimes(2);
		expect(listUserSpy).toHaveBeenCalledOnce();

		// Assert listCachedUsers cache was hit
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledTimes(2);
		expect(listUserSpy).toHaveBeenCalledOnce();
	});

	test("should invalidate a path and leave other caches unchanged", async () => {
		const getUserSpy = vi.fn();
		const listUserSpy = vi.fn().mockResolvedValue([]);

		const getCachedUser = cached(getUserSpy, ["getUser"]);
		const listCachedUsers = cached(listUserSpy, ["users"]);

		const worker = cloudflare({
			async fetch() {
				if (pathname() === "/users") return await listCachedUsers();
				if (method() === "GET") return await getCachedUser();
				revalidatePath("/users/*");
			},
		});

		// Populate getCachedUser cache
		const ctx = createExecutionContext();
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).not.toHaveBeenCalled();

		// Assert getCachedUser cache was hit
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).not.toHaveBeenCalled();

		// Populate listCachedUsers cache
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(listUserSpy).toHaveBeenCalledOnce();
		expect(getUserSpy).toHaveBeenCalledOnce();

		// Assert listCachedUsers cache was hit
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).toHaveBeenCalledOnce();

		/** Invalidate getCachedUser cache */
		await worker.fetch(new Request(`${URL}/users/123`, { method: "POST" }), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledOnce();
		expect(listUserSpy).toHaveBeenCalledOnce();

		// Assert getCachedUser cache miss
		await worker.fetch(new Request(`${URL}/users/123`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledTimes(2);
		expect(listUserSpy).toHaveBeenCalledOnce();

		// Assert listCachedUsers cache was still hit
		await worker.fetch(new Request(`${URL}/users`), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(getUserSpy).toHaveBeenCalledTimes(2);
		expect(listUserSpy).toHaveBeenCalledOnce();
	});
});
