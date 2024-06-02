import {
	cloudflare,
	env,
	executionContext,
	inject,
	locals,
	request,
} from "@galaxiajs/cloudflare-kit";
import type { Client } from "@libsql/client";
import { ExtraErrorData, RewriteFrames } from "@sentry/integrations";
import { type AppDatabase, createConnection } from "db/client";
import { RecordNotFoundError, UniqueConstraintFailed } from "db/utils/exceptions";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Toucan } from "toucan-js";
import { ZodError } from "zod";
import { UnauthorisedError } from "./auth/exceptions";
import { InvalidCallbackStateError, UnknownProviderError } from "./oauth/exceptions";
import { authRoutes } from "./routes/auth.route";
import { oauthRoutes } from "./routes/oauth.route";
import { usersRoutes } from "./routes/users.route";
import { dev, preview } from "./utils/context";

declare module "@galaxiajs/cloudflare-kit" {
	interface Secrets {
		DatabaseUrl: string;
		DatabaseSecret: string;
		SentryDsn: string;
		GithubClientId: string;
		GithubClientSecret: string;
		GoogleClientId: string;
		GoogleClientSecret: string;
		WebAppUrl: string;
	}

	interface Locals {
		db: AppDatabase;
		connection: Client;
		sentry: Toucan;
	}

	interface Bindings {
		Bucket: R2Bucket;
	}
}

inject(() => {
	const { DatabaseUrl, DatabaseSecret } = env();
	return createConnection({ url: DatabaseUrl, authToken: DatabaseSecret });
});

inject(() => ({
	sentry: new Toucan({
		request: request(),
		context: executionContext(),
		dsn: env().SentryDsn,
		attachStacktrace: true,
		environment: dev() || preview() ? "dev" : "prod",
		integrations: [
			new ExtraErrorData(),
			new RewriteFrames({
				iteratee(frame) {
					frame.abs_path = "app:///";
					return frame;
				},
			}),
		],
	}),
}));

const IGNORED_ERRORS = [
	ZodError,
	UnauthorisedError,
	RecordNotFoundError,
	UniqueConstraintFailed,
	UnknownProviderError,
	InvalidCallbackStateError,
];

const app = new Hono()
	.use(cors())
	.route("/auth", authRoutes)
	.route("/oauth", oauthRoutes)
	.route("/users", usersRoutes)
	.onError((error, c) => {
		let eventId = undefined;

		if (!IGNORED_ERRORS.some((e) => error instanceof e)) {
			const { sentry } = locals();
			const eventId = sentry.captureException(error);
			console.info(
				`Logged an exception (${error.constructor.name}) to Sentry (${eventId})`
			);
		}

		return c.json({ error, errorId: eventId });
	});

export default cloudflare(app);
