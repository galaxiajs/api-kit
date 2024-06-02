import { createId } from "db/utils/sql";
import { useTransaction } from "db/utils/transaction";
import { zod } from "db/utils/zod";
import { eq } from "drizzle-orm";
import { Create, Info } from "./schema";
import { tokens } from "./token.sql";

const create = zod(Create, (token) =>
	useTransaction(async (tx) => {
		await invalidateAllByUserId(token.userId);
		const id = createId();
		await tx
			.insert(tokens)
			.values({ ...token, id })
			.execute();

		return id;
	})
);

const fromCode = zod(Info.shape.code, (code) =>
	useTransaction((tx) =>
		tx
			.select()
			.from(tokens)
			.where(eq(tokens.code, code))
			.execute()
			.then((rows) => rows[0] as Info | undefined)
	)
);

const invalidateAllByUserId = zod(Info.shape.userId, (userId) =>
	useTransaction(async (tx) => {
		await tx.delete(tokens).where(eq(tokens.userId, userId)).execute();
	})
);

export const Token = {
	create,
	fromCode,
	invalidateAllByUserId,
};
