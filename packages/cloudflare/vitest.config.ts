import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import paths from "vite-tsconfig-paths";

const COMPATIBILITY_DATE = "2024-04-05";
const COMPATIBILITY_FLAGS = ["nodejs_compat"];

export default defineWorkersProject({
	plugins: [paths()],
	test: {
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
