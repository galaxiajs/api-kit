import { type Config, createClient } from "@libsql/client/web";
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql";
import { type AppSchema, schema } from "./schema";

export type AppDatabase = LibSQLDatabase<AppSchema>;

// @ts-expect-error I can actually assign to it, thank you
Symbol.dispose ??= Symbol("Symbol.dispose");
// @ts-expect-error I can actually assign to it, thank you
Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");

export function createConnection(config: Config) {
	const connection = createClient(config);
	const db = drizzle(connection, { schema });

	Object.assign(connection, {
		[Symbol.dispose]() {
			connection.close();
		},
	});

	return { db, connection };
}
