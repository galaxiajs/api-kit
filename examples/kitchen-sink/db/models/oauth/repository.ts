import { createId } from "db/utils/sql";
import { useTransaction } from "db/utils/transaction";
import { zod } from "db/utils/zod";
import { and, eq } from "drizzle-orm";
import { oauth } from "./oauth.sql";
import { Create, Info } from "./schemas";

const create = zod(Create, (user) =>
	useTransaction(async (tx) => {
		const id = createId();
		await tx
			.insert(oauth)
			.values({ ...user, id })
			.execute();

		return id;
	})
);

const fromProviderUserID = zod(
	Info.pick({ providerId: true, providerUserId: true }),
	({ providerId, providerUserId }) =>
		useTransaction((tx) =>
			tx
				.select()
				.from(oauth)
				.where(
					and(eq(oauth.providerId, providerId), eq(oauth.providerUserId, providerUserId))
				)
				.execute()
				.then((rows) => rows[0] as Info | undefined)
		)
);

export const OAuth = {
	create,
	fromProviderUserID,
};
