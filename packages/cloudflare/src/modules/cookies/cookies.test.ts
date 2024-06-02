import { createExecutionContext } from "cloudflare:test";
import { Cookie } from "oslo/cookie";
import { cloudflare } from "src/handler";
import { describe, expect, test } from "vitest";
import { response } from "../response";
import { cookies } from "./cookies";

function requestHeadersWithCookies(cookies: string) {
	return new Headers({ cookie: cookies });
}

describe("cookies", () => {
	const ctx = createExecutionContext();
	const url = "https://example.com";

	test("should add cookies from Set-Cookie header during exeuction", async () => {
		const worker = cloudflare({
			fetch() {
				response().headers.set(
					"Set-Cookie",
					"c=3; HttpOnly; Path=/; Secure; SameSite=Strict; Domain=https://example.com; Max-Age=86400"
				);

				const cookieList = cookies();

				expect(cookieList.size).toEqual(3);
				expect(cookieList.getAll()).toEqual([
					{ name: "a", value: "1", attributes: {} },
					{ name: "b", value: "2", attributes: {} },
					{
						name: "c",
						value: "3",
						attributes: {
							httpOnly: true,
							path: "/",
							secure: true,
							domain: "https://example.com",
							sameSite: "strict",
							maxAge: 86400,
						},
					},
				]);
			},
		});

		const headers = requestHeadersWithCookies("a=1; b=2");
		const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
		expect(res.headers.get("Set-Cookie")).toEqual(
			"a=1, b=2, c=3; Domain=https://example.com; HttpOnly; Max-Age=86400; Path=/; SameSite=Strict; Secure"
		);
	});

	test("cookies().has()", async () => {
		const worker = cloudflare({
			fetch() {
				const cookieList = cookies();
				cookieList.set("foo", "bar");

				expect(cookieList.size).toEqual(3);
				expect(cookieList.has("foo")).toBe(true);
			},
		});

		const headers = requestHeadersWithCookies("a=1; b=2");
		await worker.fetch(new Request(url, { headers }), {}, ctx);
	});

	test("should stringify cookies", async () => {
		const worker = cloudflare({
			fetch() {
				const cookieList = cookies();
				cookieList.set("c", "3");

				expect(cookieList.size).toEqual(3);
				expect(cookieList.toString()).toMatch("a=1, b=2, c=3");
			},
		});

		const headers = requestHeadersWithCookies("a=1; b=2");
		await worker.fetch(new Request(url, { headers }), {}, ctx);
	});

	describe("reading", () => {
		test("should parse empty cookie header", async () => {
			const worker = cloudflare({
				fetch() {
					const cookieList = cookies();

					expect(cookieList.get("a")).toEqual(undefined);
					expect(cookieList.getAll()).toEqual([]);
					expect([...cookieList]).toEqual([]);
					expect(cookieList.size).toEqual(0);
				},
			});

			await worker.fetch(new Request(url, {}), {}, ctx);
		});

		test("should handle invalid cookie header", async () => {
			const worker = cloudflare({
				fetch() {
					const cookieList = cookies();

					expect(cookieList.get("a")).toEqual(undefined);
					expect(cookieList.getAll()).toEqual([]);
					expect(cookieList.size).toEqual(0);
				},
			});

			const headers = requestHeadersWithCookies("a=%F6");
			await worker.fetch(new Request(url, { headers }), {}, ctx);
		});

		test("should parse single cookie in cookie header", async () => {
			const worker = cloudflare({
				fetch() {
					const cookieList = cookies();

					expect(cookieList.size).toEqual(1);
					expect(cookieList.get("a")).toEqual({ name: "a", value: "1", attributes: {} });
					expect(cookieList.getAll()).toEqual([
						{ name: "a", value: "1", attributes: {} },
					]);
				},
			});
			const headers = requestHeadersWithCookies("a=1");
			await worker.fetch(new Request(url, { headers }), {}, ctx);
		});

		test("should parse multiple cookies in cookie header", async () => {
			const worker = cloudflare({
				fetch() {
					const cookieList = cookies();

					expect(cookieList.size).toEqual(2);
					expect(cookieList.getAll("a")).toEqual([
						{ name: "a", value: "1", attributes: {} },
					]);
					expect(cookieList.getAll()).toEqual([
						{ name: "a", value: "1", attributes: {} },
						{ name: "b", value: "2", attributes: {} },
					]);
				},
			});

			const headers = requestHeadersWithCookies("a=1; b=2");
			await worker.fetch(new Request(url, { headers }), {}, ctx);
		});

		test("should parse multiple cookies followed by a semicolon in cookie header", async () => {
			const worker = cloudflare({
				fetch() {
					const cookieList = cookies();

					expect(cookieList.size).toEqual(2);
					expect(cookieList.getAll()).toEqual([
						{ name: "a", value: "1", attributes: {} },
						{ name: "b", value: "2", attributes: {} },
					]);
				},
			});

			const headers = requestHeadersWithCookies("a=1; b=2;");
			await worker.fetch(new Request(url, { headers }), {}, ctx);
		});
	});

	describe("writing", () => {
		describe("using cookie attributes", () => {
			test("should add cookie", async () => {
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set("c", "3");

						expect(cookieList.size).toEqual(3);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
							{ name: "b", value: "2", attributes: {} },
							{ name: "c", value: "3", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=2, c=3");
			});

			test("should update cookie", async () => {
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set("b", "hello!");

						expect(cookieList.size).toEqual(2);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
							{ name: "b", value: "hello!", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=hello!");
			});

			test("should delete maxAge=0 cookie from map", async () => {
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set("b", "foo", { maxAge: 0 });

						expect(cookieList.size).toEqual(1);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=foo; Max-Age=0");
			});

			test("should delete expired cookie from map", async () => {
				const date = new Date("2024-01-01T12:00:00Z");
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set("b", "foo", { expires: date });

						expect(cookieList.size).toEqual(1);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual(
					"a=1, b=foo; Expires=Mon, 01 Jan 2024 12:00:00 GMT"
				);
			});

			describe("delete", () => {
				test("should ignore unknown cookie", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.delete("c");

							expect(cookieList.size).toEqual(2);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
								{ name: "b", value: "2", attributes: {} },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1; b=2");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=2");
				});

				test("should delete cookie", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.delete("b");

							expect(cookieList.size).toEqual(1);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1; b=2");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=2; Max-Age=0");
				});

				test("should not delete cookie if domains do not match", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.set("b", "2", { domain: "https://original.com" });
							cookieList.delete("b", { domain: "https://example.com" });

							expect(cookieList.size).toEqual(2);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
								{ name: "b", value: "2", attributes: { domain: "https://original.com" } },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual(
						"a=1, b=2; Domain=https://original.com"
					);
				});

				test("should not delete cookie if paths do not match", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.set("b", "2", { path: "/foo" });
							cookieList.delete("b", { path: "/" });

							expect(cookieList.size).toEqual(2);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
								{ name: "b", value: "2", attributes: { path: "/foo" } },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=2; Path=/foo");
				});

				test("should delete cookie if paths and domains match", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.set("b", "2", { path: "/", domain: "https://example.com" });
							cookieList.delete("b", { path: "/", domain: "https://example.com" });

							expect(cookieList.size).toEqual(1);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual(
						"a=1, b=2; Domain=https://example.com; Max-Age=0; Path=/"
					);
				});

				test("should delete many cookies", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.delete(["a", "b"]);

							expect(cookieList.size).toEqual(0);
							expect(cookieList.getAll()).toEqual([]);
						},
					});

					const headers = requestHeadersWithCookies("a=1; b=2");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual("a=1; Max-Age=0, b=2; Max-Age=0");
				});
			});
		});

		describe("using a cookie instance", () => {
			test("should add cookie", async () => {
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set(new Cookie("c", "3", {}));

						expect(cookieList.size).toEqual(3);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
							{ name: "b", value: "2", attributes: {} },
							{ name: "c", value: "3", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=2, c=3");
			});

			test("should update cookie", async () => {
				const worker = cloudflare({
					fetch() {
						const cookieList = cookies();
						cookieList.set(new Cookie("b", "hello!", {}));

						expect(cookieList.size).toEqual(2);
						expect(cookieList.getAll()).toEqual([
							{ name: "a", value: "1", attributes: {} },
							{ name: "b", value: "hello!", attributes: {} },
						]);
					},
				});

				const headers = requestHeadersWithCookies("a=1; b=2");
				const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
				expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=hello!");
			});

			describe("delete", () => {
				test("should delete maxAge=0 cookie from map", async () => {
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.set(new Cookie("b", "foo", { maxAge: 0 }));

							expect(cookieList.size).toEqual(1);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1; b=2");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual("a=1, b=foo; Max-Age=0");
				});

				test("should delete expired cookie from map", async () => {
					const date = new Date("2024-01-01T12:00:00Z");
					const worker = cloudflare({
						fetch() {
							const cookieList = cookies();
							cookieList.set(new Cookie("b", "foo", { expires: date }));

							expect(cookieList.size).toEqual(1);
							expect(cookieList.getAll()).toEqual([
								{ name: "a", value: "1", attributes: {} },
							]);
						},
					});

					const headers = requestHeadersWithCookies("a=1; b=2");
					const res = await worker.fetch(new Request(url, { headers }), {}, ctx);
					expect(res.headers.get("Set-Cookie")).toEqual(
						"a=1, b=foo; Expires=Mon, 01 Jan 2024 12:00:00 GMT"
					);
				});
			});
		});
	});
});
