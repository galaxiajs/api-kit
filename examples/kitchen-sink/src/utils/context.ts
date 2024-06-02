import { headers } from "@galaxiajs/cloudflare-kit";

/**
 * @returns `true` when running vite dev
 */
export function dev(): boolean {
	const origin = headers().get("origin");
	return origin === "http://localhost:5173";
}

/**
 * @returns `true` when the web app is running in preview mode
 */
export function preview() {
	const origin = headers().get("origin");
	return origin === "http://localhost:4173";
}
