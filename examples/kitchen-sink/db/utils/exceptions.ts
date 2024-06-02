import type { LibsqlError } from "@libsql/client/web";
import { getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

export class RecordNotFoundError extends Error {
	constructor(
		readonly recordName: string,
		readonly fieldName: string,
		readonly fieldValue: string
	) {
		super(`Could not find ${recordName} with ${fieldName} "${fieldValue}"`);
		this.name = "RecordNotFoundError";
	}
}

const UNIQUE_ERROR_REGEX =
	/SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: (.*)\.(.*)/;

export class UniqueConstraintFailed extends Error {
	constructor(
		readonly recordName: string,
		readonly fieldName: string,
		readonly fieldValue: unknown
	) {
		super(
			`A ${recordName} with ${fieldName} "${fieldValue}" already exists, please choose another ${fieldName}`
		);
		this.name = "UniqueConstraintFailed";
	}

	static getFieldName(error: LibsqlError, table: SQLiteTable) {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const [_, tableName, sqliteColumnName] = error.message.match(UNIQUE_ERROR_REGEX)!;
		const columns = getTableColumns(table);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const field = Object.entries(columns).find(([_, c]) => c.name === sqliteColumnName)!;
		const fieldName = field[0];
		return { tableName, fieldName };
	}
}
