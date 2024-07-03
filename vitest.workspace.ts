import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"packages/*/vite.config.ts",
	"packages/*/vite.config.*.ts",
	"packages/*/vitest.config.ts",
	"packages/*/vitest.config.*.ts",
	"!packages/**/*.d.ts",
]);
