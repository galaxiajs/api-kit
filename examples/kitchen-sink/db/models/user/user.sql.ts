import { id, softDelete, timestamps } from "db/utils/sql";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	...id,
	username: text("username", { length: 255 }).notNull().unique(),
	email: text("email", { length: 255 }).notNull().unique(),
	avatarUrl: text("avatar_url", { length: 255 }),
	/** null when user first signs up - false when user changes email */
	emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
	...timestamps,
	...softDelete,
});
