import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "./src/exports.ts",
		"cache/index": "./src/modules/cache/exports.ts",
		"context/index": "./src/modules/context/exports.ts",
		"cookies/index": "./src/modules/cookies/exports.ts",
		"user-agent/index": "./src/modules/user-agent.ts",
		"esbuild/index": "./src/plugins/esbuild.ts",
		"vitest/index": "./src/vitest/index.ts",
	},
	format: ["esm"],
	clean: true,
	dts: true,
	external: ["cloudflare:workers", "vitest"],
	noExternal: ["oslo", "pretty-cache-header", "ua-parser-js", "set-cookie-parser"],
	minify: false,
});
