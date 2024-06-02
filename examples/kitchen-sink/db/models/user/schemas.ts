import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { z } from "zod";
import { array, coerce, date, object, string, enum as zodEnum } from "zod";
import { OAuth as OAuthSchemas } from "../oauth/schemas";
import type { user } from "./user.sql";

export type Create = Omit<
	InferInsertModel<typeof user>,
	"id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export const Create = object({
	username: string()
		.min(2, "must be at least two characters long")
		.max(32, "must be less than 32 characters long"),
	email: string().trim().email("must be a valid email address").min(1),
	emailVerified: date().nullable().default(null),
	avatarUrl: string().url("must be a valid URL").nullable().default(null),
}) satisfies z.ZodType<Create>;

export type Info = InferSelectModel<typeof user>;
export const Info = object({
	id: string(),
	username: string(),
	avatarUrl: Create.shape.avatarUrl.removeDefault(),
	email: string(),
	emailVerified: Create.shape.emailVerified.removeDefault(),
	createdAt: date(),
	updatedAt: date(),
	deletedAt: date().nullable(),
}) satisfies z.ZodType<Info>;

export type Update = z.input<typeof Update>;
export const Update = object({
	id: Info.shape.id,
	data: Create.omit({ emailVerified: true })
		.partial()
		.refine(
			({ username, email, avatarUrl }) =>
				username !== undefined || email !== undefined || avatarUrl !== undefined,
			{ message: "at least one user field update must be provided" }
		),
});

export type SortBy = z.infer<typeof Sort.shape.sortBy>;
export type Sort = z.infer<typeof Sort>;
export const Sort = object({
	sortBy: zodEnum(["email", "id", "username", "createdAt"]),
	sortDirection: zodEnum(["asc", "desc"]).default("asc").optional(),
});

export type List = z.input<typeof List>;
export const List = object({
	pageSize: coerce.number().int().positive().optional(),
	pageNumber: coerce.number().int().min(1).default(1),
	sorting: array(Sort).default([{ sortBy: "username", sortDirection: "asc" }]),
});

export type OAuth = z.infer<typeof OAuth>;
export const OAuth = object({
	user: Create,
	account: OAuthSchemas.Create.omit({ userId: true }),
});

export * as User from "./schemas";
