import { WorkerEntrypoint } from "cloudflare:workers";
import { cloudflare } from "src/handler";
import { inject } from "src/inject";
import { cache } from "src/modules/cache/cache";
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
import { expect } from "vitest";
import { sendWelcomeEmail } from "./users";

inject(() => ({ requestId: "123" }));

export default class TestHandler extends cloudflare(
	WorkerEntrypoint<{ TestBucket: R2Bucket }>
) {
	// @ts-expect-error
	async fetch(req: Request) {
		const services = bindings();

		expect(services).toHaveProperty("TestBucket");
		// @ts-expect-error TODO: Fix
		expect(services.TestBucket).toMatchObject({
			put: expect.any(Function),
			get: expect.any(Function),
		});

		cache({ maxAge: "1w" });
		waitUntil(new Promise((resolve) => sendWelcomeEmail().then(resolve)));
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
		expect(locals()).toEqual({ requestId: "123" });
		expect(executionContext()).toBe(this.ctx);

		expect(Object.fromEntries(searchParams())).toEqual({ sort: "asc" });
		expect(Object.fromEntries(headers())).toEqual({
			"x-request-id": "some-req-id",
			"cf-connecting-ip": "some-ip",
		});

		return { id: "123" };
	}
}
