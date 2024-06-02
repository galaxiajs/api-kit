import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { date, object, string } from "zod";
import type { z } from "zod";
import type { oauth } from "./oauth.sql";

export type Create = Omit<
	InferInsertModel<typeof oauth>,
	"id" | "updatedAt" | "createdAt"
>;

export const Create = object({
	userId: string().cuid2(),
	providerUserId: string(),
	providerId: string(),
}) satisfies z.ZodType<Create>;

export type Info = InferSelectModel<typeof oauth>;
export const Info = Create.extend({
	id: string().cuid2(),
	createdAt: date(),
	updatedAt: date(),
	deletedAt: date().nullable(),
}) satisfies z.ZodType<Info>;

export * as OAuth from "./schemas";
