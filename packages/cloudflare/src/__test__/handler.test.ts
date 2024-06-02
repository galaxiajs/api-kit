import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { cloudflare } from "src/handler";
import { inject } from "src/inject";
import { cache, cached } from "src/modules/cache/cache";
import { cookies } from "src/modules/cookies/cookies";
import { bindings, env, locals } from "src/modules/env";
import { executionContext, waitUntil } from "src/modules/execution-context";
import {
	url,
	headers,
	ip,
	method,
	pathname,
	request,
	searchParams,
} from "src/modules/request";
import { response, status } from "src/modules/response";
import { describe, expect, test, vi } from "vitest";

describe("context", () => {
	test("should throw error trying to access request at the module level", async () => {
		expect(() => request()).toThrowError(
			"Could not find handler context. Are you calling this at the module level?"
		);
	});

	test("should throw error trying to access request context without wrapping handler", async () => {
		const worker = {
			async fetch() {
				request();
			},
		};

		await expect(() => worker.fetch()).rejects.toThrowError(
			"Could not find handler context. Are you calling this at the module level?"
		);
	});

	test("should throw error trying to access locals at the module level", async () => {
		expect(() => locals()).toThrowError(
			"Could not find locals context. Are you calling locals() at the module level?"
		);
	});

	test("should throw error trying to access locals without wrapping handler", async () => {
		const worker = {
			async fetch() {
				locals();
			},
		};

		await expect(() => worker.fetch()).rejects.toThrowError(
			"Could not find locals context. Are you calling locals() at the module level?"
		);
	});

	test("should use consumer-returned response", async () => {
		const worker = cloudflare({
			fetch() {
				cookies().set("session", "123");
				cache({ maxAge: "1w" });
				status(302);
				response().headers.set("X-Foo", "Bar");

				return Response.json(
					{ message: "Hello World" },
					{
						status: 201,
						headers: {
							"Set-Cookie": "b=1",
						},
					}
				);
			},
		});

		const req = new Request("https://example.com/users/123?sort=asc");
		const ctx = createExecutionContext();
		const res = await worker.fetch(req.clone(), {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(res.status).toEqual(201);
		expect(res.headers.get("X-Foo")).toEqual("Bar");
		expect(res.headers.get("Set-Cookie")).toEqual("session=123, b=1");
		expect(res.headers.get("Content-Type")).toEqual("application/json");
		expect(res.headers.get("Cache-Control")).toEqual("max-age=604800");
		await expect(res.json()).resolves.toEqual({ message: "Hello World" });
	});

	test("context methods should be available", async () => {
		const mailer = cloudflare({
			fetch: () => Response.json({ message: "Hello World" }),
		});

		const waitUntilSpy = vi.fn().mockResolvedValue({ foo: "bar" });
		const cacheSpy = vi
			.fn<[id: string]>()
			.mockImplementation((id) => Promise.resolve({ id }));

		const getCachedUser = cached(cacheSpy, ["key"]);

		inject(() => ({ requestId: "123" }));

		const worker = cloudflare({
			async fetch() {
				const user = await getCachedUser("123");

				cache({ maxAge: "1w" });
				waitUntil(new Promise((resolve) => waitUntilSpy().then(resolve)));
				status(201);
				response().headers.set("X-Foo", "Bar");
				response().headers.set("Content-Type", "application/json");
				cookies().set("session", "123");

				expect(method()).toEqual("GET");
				expect(request()).toEqual(req);
				expect(pathname()).toEqual("/users/123");
				expect(ip()).toEqual("some-ip");
				expect(url()).toEqual(new URL("https://example.com/users/123?sort=asc"));
				expect(env()).toEqual({ DatabaseUrl: "some-url" });
				expect(bindings()).toEqual({ Mailer: mailer });
				expect(locals()).toEqual({ requestId: "123" });
				expect(executionContext()).toBe(ctx);

				expect(user).toEqual({ id: "123" });
				expect(Object.fromEntries(searchParams())).toEqual({ sort: "asc" });
				expect(Object.fromEntries(headers())).toEqual({
					"x-request-id": "some-req-id",
					"cf-connecting-ip": "some-ip",
				});

				return user;
			},
		});

		const req = new Request("https://example.com/users/123?sort=asc", {
			headers: {
				"X-Request-Id": "some-req-id",
				"cf-connecting-ip": "some-ip",
			},
		});
		const secrets = { DatabaseUrl: "some-url" };
		const ctx = createExecutionContext();
		const res = await worker.fetch(req.clone(), { ...secrets, Mailer: mailer }, ctx);
		await waitOnExecutionContext(ctx);

		expect(res.status).toEqual(201);
		expect(res.headers.get("X-Foo")).toEqual("Bar");
		expect(res.headers.get("Set-Cookie")).toEqual("session=123");
		expect(res.headers.get("Content-Type")).toEqual("application/json;charset=utf-8");
		expect(res.headers.get("Cache-Control")).toEqual("max-age=604800");
		await expect(res.json()).resolves.toEqual({ id: "123" });

		expect(waitUntilSpy).toHaveBeenCalledOnce();
		expect(cacheSpy).toHaveBeenCalledOnce();

		await worker.fetch(req.clone(), { ...secrets, Mailer: mailer }, ctx);
		await waitOnExecutionContext(ctx);

		expect(waitUntilSpy).toHaveBeenCalledTimes(2);
		expect(cacheSpy).toHaveBeenCalledOnce();
	});
});
