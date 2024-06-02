import { LibsqlError } from "@libsql/client/web";
import { UniqueConstraintFailed } from "db/utils/exceptions";
import { createId, isNotDeleted } from "db/utils/sql";
import { useTransaction } from "db/utils/transaction";
import { zod } from "db/utils/zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { object } from "zod";
import { OAuth } from "../oauth/repository";
import { Token } from "../token/repository";
import { Token as TokenSchema } from "../token/schema";
import { UserEmailTaken, UserNotFound, UserUsernameTaken } from "./exceptions";
import { Create, Info, List, OAuth as OAuthSchema, type Sort, Update } from "./schemas";
import { user } from "./user.sql";

const create = zod(Create, (params) =>
	useTransaction(async (tx) => {
		const userId = createId();
		await tx
			.insert(user)
			.values({ ...params, id: userId })
			.execute()
			.catch((reason) => {
				if (reason instanceof LibsqlError && reason.code === "SQLITE_CONSTRAINT_UNIQUE") {
					const { fieldName } = UniqueConstraintFailed.getFieldName(reason, user);
					if (fieldName === "username") throw new UserUsernameTaken(params.username);
					throw new UserEmailTaken(params.email);
				}

				throw reason;
			});

		return userId;
	})
);

const createFromOAuth = zod(OAuthSchema, ({ user, account }) =>
	useTransaction(async () => {
		const userId = await create(user);
		await OAuth.create({ userId, ...account });
		return userId;
	})
);

const createFromToken = zod(
	object({
		user: Create,
		token: TokenSchema.Create.omit({ userId: true, email: true }),
	}),
	({ user, token }) =>
		useTransaction(async () => {
			const existing = await fromEmail(user.email);
			const userId = existing?.id ?? (await create(user));

			await Token.create({ ...token, email: user.email, userId });

			return userId;
		})
);

const fromID = zod(Info.shape.id, (id) =>
	useTransaction((tx) =>
		tx
			.select()
			.from(user)
			.where(and(eq(user.id, id), isNotDeleted(user)))
			.limit(1)
			.execute()
			.then((rows) => rows[0] as Info | undefined)
	)
);

const fromIDOrThrow = zod(Info.shape.id, (id) =>
	fromID(id).then((user) => {
		if (user) return user;

		throw new UserNotFound("id", id);
	})
);

const fromEmail = zod(Info.shape.email, (email) =>
	useTransaction((tx) =>
		tx
			.select()
			.from(user)
			.where(and(eq(user.email, email), isNotDeleted(user)))
			.limit(1)
			.execute()
			.then((rows) => rows[0] as Info | undefined)
	)
);

const fromEmailOrThrow = zod(Info.shape.email, (email) =>
	fromEmail(email).then((user) => {
		if (user) return user;

		throw new UserNotFound("email", email);
	})
);

const list = zod(List, ({ pageNumber, pageSize, sorting }) =>
	useTransaction(async (tx) => {
		/**
		 * Do the filtering in a subquery, to limit how many records are returned
		 * for sorting.
		 */
		const subquery = tx
			.select()
			.from(user)
			.where(isNotDeleted(user))
			.groupBy(user.id)
			.as("filtered_users");

		const sortColumns: Sort[] =
			sorting.length === 0 ? [{ sortBy: "username", sortDirection: "asc" }] : sorting;

		const sort = sortColumns.map((s) =>
			s.sortDirection === "asc" ? asc(subquery[s.sortBy]) : desc(subquery[s.sortBy])
		);

		let query = tx
			.select({
				id: subquery.id,
				username: subquery.username,
				email: subquery.email,
				emailVerified: subquery.emailVerified,
				avatarUrl: subquery.avatarUrl,
				createdAt: subquery.createdAt,
				updatedAt: subquery.updatedAt,
				deletedAt: subquery.deletedAt,
			})
			.from(subquery)
			.orderBy(...sort);

		if (pageSize) {
			const offset = (pageNumber - 1) * pageSize;
			return await query.offset(offset).limit(pageSize).execute();
		}

		return await query.execute();
	})
);

const update = zod(Update, ({ id, data }) =>
	useTransaction((tx) =>
		tx
			.update(user)
			.set(data)
			.where(and(eq(user.id, id), isNotDeleted(user)))
			.execute()
			.then(({ rowsAffected }) => {
				if (rowsAffected === 0) {
					throw new UserNotFound("id", id);
				}
			})
	)
);

const remove = zod(Info.shape.id, (input) =>
	useTransaction((tx) =>
		tx
			.update(user)
			.set({
				deletedAt: new Date(),
			})
			.where(and(eq(user.id, input), isNotDeleted(user)))
			.execute()
			.then(({ rowsAffected }) => {
				if (rowsAffected === 0) {
					throw new UserNotFound("id", input);
				}
			})
	)
);

export const User = {
	create,
	createFromOAuth,
	createFromToken,
	fromEmail,
	fromEmailOrThrow,
	fromID,
	fromIDOrThrow,
	list,
	update,
	remove,
};
