import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const { parsed: env = {} } = dotenv.config({ path: "./.dev.vars" });

export default defineConfig({
	dialect: "sqlite",
	schema: "./db/models/**/*.sql.ts",
	out: "./db/migrations",
	migrations: {
		table: "migrations",
	},
	driver: "turso",
	verbose: true,
	strict: true,
	dbCredentials: {
		url: env.DatabaseUrl,
		authToken: env.DatabaseSecret,
	},
});
