import { type TableConfig, type UpdateTableConfig, isNull, sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	type IntegerConfig,
	type SQLiteColumn,
	type SQLiteTableWithColumns,
	integer,
	text,
} from "drizzle-orm/sqlite-core";

export { createId } from "@paralleldrive/cuid2";

export function cuid<TName extends string>(name: TName) {
	return text(name, { length: 24 });
}

export function boolean<TName extends string>(
	name: TName,
	_config?: IntegerConfig<"boolean">
) {
	const column = integer(name, { mode: "boolean" });
	const defaultFn = column.default.bind(column);

	column.default = (value) => {
		let defaultValue = value;
		if (typeof value === "boolean") {
			defaultValue = value === true ? sql`1` : sql`0`;
		}

		return defaultFn(defaultValue);
	};

	return column;
}

export function now() {
	return sql`CURRENT_TIMESTAMP`;
}

export type TableWithColumns<TColumns extends Record<string, SQLiteColumn>> =
	SQLiteTableWithColumns<
		UpdateTableConfig<
			TableConfig,
			{
				columns: TColumns;
			}
		>
	>;

type DeletedAt = {
	deletedAt: AnySQLiteColumn<{ dataType: "date"; data: Date }>;
};

export function isNotDeleted<TTable extends TableWithColumns<DeletedAt> | DeletedAt>(
	table: TTable
) {
	return isNull(table.deletedAt);
}

export const id = {
	get id() {
		return cuid("id").primaryKey().notNull();
	},
};

export const timestamps = {
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now()),

	/**
	 * When the record was updated. This field is updated automatically whenever
	 * the record is changed
	 */
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.notNull()
		.default(now())
		.$onUpdate(() => new Date()),
};

export const softDelete = {
	/**
	 * Instead of deleting records, set the date a record was deleted at so we can
	 * keep it around, like a recycle bin.
	 *
	 * A job can periodically delete all records where this field is not null.
	 */
	deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
};
