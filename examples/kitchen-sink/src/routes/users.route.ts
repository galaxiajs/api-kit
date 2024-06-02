import { bindings, locals } from "@galaxiajs/cloudflare-kit";
import { cached, revalidateTag } from "@galaxiajs/cloudflare-kit/cache";
import { zValidator } from "@hono/zod-validator";
import { User as UserRepository } from "db/models/user/repository";
import { User } from "db/models/user/schemas";
import { createTransaction } from "db/utils/transaction";
import { Hono } from "hono";
import { requireSession } from "src/auth/auth";
import { UnauthorisedError } from "src/auth/exceptions";
import { throwOnValidationError } from "src/utils/zod";
import { z } from "zod";

const listCachedUsers = cached(
	async (params: User.List) => UserRepository.list(params),
	["users"]
);

const getCachedUser = cached(
	(userId: string) => UserRepository.fromIDOrThrow(userId),
	["users"],
	{
		tags: (userId) => [`getUser-${userId}`],
	}
);

export const usersRoutes = new Hono()
	.get(
		"/",
		zValidator(
			"query",
			z
				.object({
					sort: z.union([User.Sort.shape.sortBy, User.Sort.shape.sortBy.array()]),
					dir: z.union([
						User.Sort.shape.sortDirection,
						User.Sort.shape.sortDirection.array(),
					]),
					limit: User.List.shape.pageSize,
					page: User.List.shape.pageNumber,
				})
				.partial(),
			throwOnValidationError()
		),
		async (c) => {
			const { sort: sortCol = [], dir: sortDir = [], ...q } = c.req.valid("query");
			const sort = Array.isArray(sortCol) ? sortCol : [sortCol];
			const dir = Array.isArray(sortDir) ? sortDir : [sortDir];
			const sorting = sort.map((sortBy, i) => ({ sortBy, sortDirection: dir[i] }));

			const allUsers = await listCachedUsers({
				pageSize: q.limit,
				pageNumber: q.page,
				sorting,
			});

			return c.json({ users: allUsers });
		}
	)
	.get("/:userId", async (c) => {
		const userId = c.req.param("userId");
		const user = await getCachedUser(userId);
		return c.json({ user });
	})
	.patch(
		"/:userId",
		zValidator(
			"form",
			User.Update.shape.data
				.innerType()
				.pick({ email: true, username: true })
				.extend({
					avatarUrl: z.union([z.literal("null"), z.instanceof(File)], {
						errorMap(issue, ctx) {
							if (issue.code === "invalid_union") {
								return { message: "Invalid value, expected a File or a null string" };
							}

							return { message: ctx.defaultError };
						},
					}),
				})
				.partial(),
			throwOnValidationError()
		),
		async (c) => {
			const session = await requireSession();
			const userId = c.req.param("userId");
			const { avatarUrl: avatarFile, ...params } = c.req.valid("form");
			if (avatarFile) {
				Object.assign(params, {
					avatarUrl:
						avatarFile === "null" ? undefined : await uploadAvatar(avatarFile, userId),
				});
			}

			await createTransaction(async () => {
				/** Update first so we can see if the user exists */
				await UserRepository.update({ id: userId, data: params });
				if (userId !== session.userId) {
					throw new UnauthorisedError("You are not authorised to edit this user");
				}

				revalidateTag("users");
				revalidateTag(`getUser-${userId}`);
			});

			return c.body(null, 204);
		}
	)
	.delete("/:userId", async (c) => {
		const session = await requireSession();
		const userId = c.req.param("userId");

		if (userId !== session.userId) {
			throw new UnauthorisedError("You are not authorised to delete this user");
		}

		await UserRepository.remove(userId);
		revalidateTag("users");
		revalidateTag(`getUser-${userId}`);
		return c.body(null, 204);
	});

async function uploadAvatar(file: File, userId: string) {
	const { Bucket } = bindings();
	const { sentry } = locals();

	const now = new Date().getTime();
	const key = `avatars/${userId}/${now}_${file.name}`;
	await Bucket.put(key, file);
	const url = `https://pulsar-dev.r2.dev/${key}`;

	sentry.addBreadcrumb({
		category: "users",
		message: `Uploaded new avatar URL (${url})`,
		level: "info",
	});

	return url;
}
