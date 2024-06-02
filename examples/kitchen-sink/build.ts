import pulsar from "@pulsar/cloudflare/esbuild";
import { build } from "esbuild";

await build({
	entryPoints: { worker: "./src/worker.ts" },
	plugins: [pulsar()],
	logLevel: "info",
});
