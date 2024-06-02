import { cuid, id, timestamps } from "db/utils/sql";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "../user/user.sql";

export const oauth = sqliteTable(
	"oauth_account",
	{
		...id,
		/** OAuth provider */
		providerId: text("provider_id", { length: 255 }).notNull(),
		/** ID from the OAuth provider */
		providerUserId: text("provider_user_id", { length: 255 }).notNull(),
		/** ID of the user that we store */
		userId: cuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		provider: uniqueIndex("oauth_account_user_provider").on(
			table.providerId,
			table.providerUserId
		),
		userIdx: index("oauth_account_user_id_idx").on(table.userId),
	})
);
