import pulsar from "@galaxiajs/cloudflare-kit/esbuild";
import { build } from "esbuild";

await build({
	entryPoints: { worker: "./src/worker.ts" },
	plugins: [pulsar()],
	logLevel: "info",
});
