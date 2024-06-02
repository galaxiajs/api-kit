import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { ZodType, date, object, string } from "zod";
import { User } from "../user/schemas";
import { OTP_CODE_LENGTH } from "./constants";
import { type tokens } from "./token.sql";

export type Create = Omit<
	InferInsertModel<typeof tokens>,
	"id" | "createdAt" | "updatedAt"
>;

export const Create = object({
	userId: User.Info.shape.id,
	email: User.Info.shape.email,
	code: string().length(OTP_CODE_LENGTH),
	expiresAt: date(),
}) satisfies ZodType<Create>;

export type Info = InferSelectModel<typeof tokens>;
export const Info = object({
	id: string().cuid2(),
	userId: string(),
	email: string(),
	code: string(),
	expiresAt: date(),
	createdAt: date(),
	updatedAt: date(),
}) satisfies ZodType<Info>;

export * as Token from "./schema";
