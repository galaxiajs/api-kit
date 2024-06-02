import { createResponse } from "src/create-response";
import { describe, expect, test } from "vitest";

describe("response", () => {
	test("should return response instance as-is", async () => {
		const expected = new Response("foo", { status: 306 });
		const response = createResponse(expected, {
			headers: new Headers({ "X-FOO": "bar" }),
		});

		expect(response.status).toEqual(306);
		expect(response.headers.get("x-foo")).toEqual("bar");
		await expect(response.text()).resolves.toEqual("foo");
	});

	test("should return Blob instance as-is", async () => {
		const expected = new Blob();
		const response = createResponse(expected, { headers: new Headers() });

		await expect(response.blob()).resolves.toEqual(expected);
	});

	test("should return string and string", async () => {
		const response = createResponse("some-string", { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual("text/plain;charset=UTF-8");
		await expect(response.text()).resolves.toEqual("some-string");
	});

	test("should return object as JSON", async () => {
		const response = createResponse({ foo: "bar" }, { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual(
			"application/json;charset=utf-8"
		);
		await expect(response.json()).resolves.toEqual({ foo: "bar" });
	});

	test("should return array as JSON", async () => {
		const response = createResponse([1, 2, 3], { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual(
			"application/json;charset=utf-8"
		);
		await expect(response.json()).resolves.toEqual([1, 2, 3]);
	});

	test("should return custom non-object class as text", async () => {
		class MyCustomClass extends Array {
			readonly id = 1;
		}
		const instance = new MyCustomClass(2);
		instance.push(1, 2);
		const response = createResponse(instance, { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual("text/plain;charset=UTF-8");
	});

	test("should return custom object class as JSON", async () => {
		class MyCustomClass {
			readonly id = 1;
		}

		const response = createResponse(new MyCustomClass(), { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual(
			"application/json;charset=utf-8"
		);
		await expect(response.json()).resolves.toEqual({ id: 1 });
	});

	test("should return undefined as null", async () => {
		const response = createResponse(undefined, { headers: new Headers() });

		expect(response.body).toBeNull();
		expect(response.headers.get("content-type")).toBeNull();
	});

	test("should serialise number as string", async () => {
		const response = createResponse(35, { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual("text/plain;charset=UTF-8");
		await expect(response.text()).resolves.toEqual("35");
	});

	test("should serialise boolean as string", async () => {
		const response = createResponse(false, { headers: new Headers() });

		expect(response.headers.get("content-type")).toEqual("text/plain;charset=UTF-8");
		await expect(response.text()).resolves.toEqual("false");
	});

	describe("when a ReadableStream is returned", () => {
		test("should return ReadableStream as-is", async () => {
			const stream = new ReadableStream();
			const response = createResponse(stream, { headers: new Headers() });

			expect(response.headers.get("content-type")).toEqual(
				"text/event-stream; charset=utf-8"
			);
			expect(response.body).toEqual(stream);
		});

		test("should use content-type header from init", async () => {
			const stream = new ReadableStream();
			const response = createResponse(stream, {
				headers: new Headers({ "content-type": "foo" }),
			});

			expect(response.headers.get("content-type")).toEqual("foo");
			expect(response.body).toEqual(stream);
		});
	});

	describe("when an error is returned", () => {
		test("should serialise as JSON", async () => {
			const response = createResponse(new Error("Some Error"), {
				headers: new Headers(),
			});

			expect(response.headers.get("content-type")).toEqual(
				"application/json;charset=utf-8"
			);
			await expect(response.json()).resolves.toEqual({
				message: "Some Error",
				name: "Error",
				// Cause is undefined, so omitted in JSON
			});
		});

		test("should set response status to 500 if status init is 2xx or 3xx", async () => {
			const response = createResponse(new Error("Some Error"), {
				headers: new Headers(),
				status: 202,
			});

			expect(response.status).toEqual(500);
		});

		test("should use status from init", async () => {
			const response = createResponse(new Error("Some Error"), {
				status: 409,
				headers: new Headers(),
			});

			expect(response.status).toEqual(409);
		});
	});

	describe("files", () => {
		test("should set headers for a non-empty file", async () => {
			const response = createResponse(new Blob(["content"]), { headers: new Headers() });

			expect(response.headers.get("accept-ranges")).toBe("bytes");
			expect(response.headers.get("content-range")).toMatch(/bytes 0-\d+\/\d+/);
		});
	});
});
