import { cuid, id, timestamps } from "db/utils/sql";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "../user/user.sql";
import { OTP_CODE_LENGTH } from "./constants";

export const tokens = sqliteTable(
	"token",
	{
		...id,
		userId: cuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" })
			// Only allow one active code per user
			.unique(),
		email: text("email", { length: 255 })
			.notNull()
			.references(() => user.email, { onDelete: "cascade" }),
		code: text("code", { length: OTP_CODE_LENGTH }).notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		...timestamps,
	},
	(table) => ({
		length: check(
			"token_code_length",
			sql`LENGTH(${table.code}) = ${sql.raw(OTP_CODE_LENGTH.toString())}`
		),
		tokensCode: index("tokens_code").on(table.code, table.userId),
	})
);
