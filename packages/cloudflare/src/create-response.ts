interface Init {
	status?: number;
	headers: Headers;
}

/**
 * Return a response, inferring the correct `Content-Type` header and wraps
 * the body in the necessary structure.
 */
export function createResponse(body: unknown, init: Init): Response {
	switch (body?.constructor?.name) {
		case "String":
			return new Response(body as any, init);

		case "Blob":
			return fileToResponse(body as Blob, init);

		case "Object":
		case "Array":
			init.headers.set("Content-Type", "application/json;charset=utf-8");
			return new Response(JSON.stringify(body), init);

		case "ReadableStream":
			if (!init.headers.get("Content-Type")) {
				init.headers.set("Content-Type", "text/event-stream; charset=utf-8");
			}

			return new Response(body as ReadableStream, init);

		case undefined:
			if (!body) return new Response(null, init);

			init.headers.set("Content-Type", "application/json;charset=utf-8");
			return new Response(JSON.stringify(body), init);

		case "Response":
			init.headers.forEach((value, key) => (body as Response).headers.append(key, value));
			return body as Response;

		case "Error":
			return errorToResponse(body as Error, init);

		// ? Maybe response or Blob
		case "Function":
			return createResponse((body as (...args: any[]) => any)(), init);

		case "Number":
		case "Boolean":
			return new Response((body as number | boolean).toString(), init);

		/** Custom classes */
		default: {
			const string = JSON.stringify(body);
			/** Char code 123 is the opening curly brace {} */
			if (string.charCodeAt(0) === 123) {
				init.headers.set("Content-Type", "application/json;charset=utf-8");
				return new Response(string, init);
			}

			/** We will not return with a JSON header as we have no clue what it could be at runtime */
			return new Response(string, init);
		}
	}
}

function errorToResponse(error: Error, init: Init): Response {
	init.headers.set("Content-Type", "application/json;charset=utf-8");

	return new Response(
		JSON.stringify({
			name: error.name,
			message: error.message,
			cause: error.cause,
		}),
		{
			status: init.status && init.status < 400 ? 500 : init.status,
			headers: init.headers,
		}
	);
}

function fileToResponse(response: File | Blob, init: Init) {
	const size = response.size;

	if (
		size &&
		init.status !== 206 &&
		init.status !== 304 &&
		init.status !== 412 &&
		init.status !== 416
	) {
		init.headers.set("accept-ranges", "bytes");
		init.headers.set("content-range", `bytes 0-${size - 1}/${size}`);
	}

	return new Response(response, init);
}
