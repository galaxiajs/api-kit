import { builtinModules } from "node:module";
import type { Plugin } from "esbuild";

const EXTERNAL = new Set([
	...builtinModules,
	...builtinModules.map((m) => `node:${m}`),
	"cloudflare:workers",
]);

export default function pulsar(): Plugin {
	return {
		name: "esbuild-plugin-api-kit",
		async setup(build) {
			const options = build.initialOptions;
			options.external ??= [];
			options.external.push(...EXTERNAL);
			options.format = "esm";
			options.splitting = false;
			options.write = true;
			options.bundle = true;
			options.outdir ??= "dist";
			options.platform = "browser";
			options.target = "esnext";
			options.mainFields ??= [];
			options.mainFields.push("module", "main");
			options.conditions ??= [];
			options.conditions.push("workr");
		},
	};
}
