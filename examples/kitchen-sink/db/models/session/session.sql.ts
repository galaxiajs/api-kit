import { cuid, id } from "db/utils/sql";
import { index, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "../user/user.sql";

export const session = sqliteTable(
	"session",
	{
		...id,
		userId: cuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: integer("expires_at").notNull(),
	},
	(table) => ({
		userIdx: index("session_user_id_idx").on(table.userId),
	})
);
