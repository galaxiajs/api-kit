import { boolean, timestamps } from "db/utils/sql";
import { sqliteTable } from "drizzle-orm/sqlite-core";

export const seeds = sqliteTable("seed", {
	isSeeded: boolean("is_seeded", { mode: "boolean" }).notNull(),
	...timestamps,
});
