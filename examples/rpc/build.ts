import cloudflare from "@galaxiajs/cloudflare-kit/esbuild";
import { build } from "esbuild";

await build({
	entryPoints: { worker: "./src/worker.ts" },
	plugins: [cloudflare()],
	logLevel: "info",
});
