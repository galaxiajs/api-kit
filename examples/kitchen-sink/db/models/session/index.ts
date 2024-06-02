import type { InferSelectModel } from "drizzle-orm";
import type { session } from "./session.sql";

export type Info = InferSelectModel<typeof session>;

export * as Session from "./index";
