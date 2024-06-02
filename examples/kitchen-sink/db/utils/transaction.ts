import { AsyncLocalStorage } from "node:async_hooks";
import { locals } from "@galaxiajs/cloudflare-kit";
import type { AppDatabase } from "db/client";
import type { AppSchema } from "db/schema";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { LibSQLTransaction } from "drizzle-orm/libsql";

export type Transaction = LibSQLTransaction<
	AppSchema,
	ExtractTablesWithRelations<AppSchema>
>;

export type TxOrDb = Transaction | AppDatabase;

export const TransactionContext = new AsyncLocalStorage<{
	tx: TxOrDb;
}>();

export function useTransaction<T>(callback: (trx: TxOrDb) => Promise<T>): Promise<T> {
	const ctx = TransactionContext.getStore();
	if (ctx) return callback(ctx.tx);

	const { db } = locals();
	return callback(db);
}

export async function createTransaction<T>(
	callback: (tx: TxOrDb) => Promise<T>
): Promise<T> {
	const ctx = TransactionContext.getStore();
	if (ctx) return await callback(ctx.tx);

	const { db } = locals();
	const result = await db.transaction((tx) =>
		TransactionContext.run({ tx }, () => callback(tx))
	);

	return result;
}
