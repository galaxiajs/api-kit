import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import paths from "vite-tsconfig-paths";

const COMPATIBILITY_DATE = "2024-04-05";
const COMPATIBILITY_FLAGS = ["nodejs_compat"];

export default defineWorkersConfig({
	plugins: [paths()],
	esbuild: {
		// https://github.com/vitejs/vite/issues/15464#issuecomment-1872485703
		target: "es2020",
	},
	test: {
		coverage: {
			all: true,
			reportOnFailure: true,
			provider: "istanbul",
		},
		poolOptions: {
			workers: {
				singleWorker: true,
				main: "./src/__test__/fixtures/handler.ts",
				miniflare: {
					name: "main",
					compatibilityDate: COMPATIBILITY_DATE,
					compatibilityFlags: COMPATIBILITY_FLAGS,
					r2Buckets: ["TestBucket"],
					bindings: { DatabaseUrl: "some-url" },
				},
			},
		},
	},
});
