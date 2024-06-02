import { zValidator } from "@hono/zod-validator";
import { bindings, waitUntil } from "@pulsar/cloudflare";
import { cookies } from "@pulsar/cloudflare/cookies";
import { Token } from "db/models/token/repository";
import { User } from "db/models/user/repository";
import { createTransaction } from "db/utils/transaction";
import { Hono } from "hono";
import { isWithinExpirationDate } from "oslo";
import { SESSION_COOKIE_NAME, createSession, lucia, session } from "src/auth/auth";
import { UnauthorisedError } from "src/auth/exceptions";
import { generateOTP } from "src/auth/utils";
import { throwOnValidationError } from "src/utils/zod";
import { z } from "zod";

export const authRoutes = new Hono()
	.get("/session/:sessionId", async (c) => {
		const auth = lucia();
		const sessionId = c.req.param("sessionId");
		const authSession = await session(sessionId);

		if (authSession) {
			const cookie = auth.createSessionCookie(authSession.id);
			const cookieList = cookies();
			cookieList.set(cookie);
		}

		return c.json({ session: authSession });
	})
	.get(
		"/request-login",
		zValidator(
			"query",
			z.object({
				redirect_uri: z.string().url().optional(),
				email: z.string({ required_error: "Please provide an email address" }).email(),
				loginUrl: z.string({ required_error: "Please provide a login URL" }).url(),
			}),
			throwOnValidationError()
		),
		async (c) => {
			const { email, loginUrl, redirect_uri } = c.req.valid("query");
			const token = generateOTP();
			const userId = await createTransaction(async () => {
				const id = await User.createFromToken({
					user: { email, username: email.split("@")[0] },
					token,
				});

				const { Mailer } = bindings();
				waitUntil(Mailer.sendLoginEmail({ email, loginUrl, loginCode: token.code }));

				return id;
			});

			if (redirect_uri) return c.redirect(redirect_uri, 302);
			return c.json({ userId, token }, 201);
		}
	)
	.get(
		"/login",
		zValidator(
			"query",
			z.object({
				redirect_uri: z.string().url().optional(),
				email: z.string({ required_error: "Please provide an email address" }).email(),
				code: z.string({ required_error: "You must provide a login code" }),
			}),
			throwOnValidationError()
		),
		async (c) => {
			const { email, code, redirect_uri } = c.req.valid("query");
			const token = await Token.fromCode(code);

			if (!token) throw new UnauthorisedError("Invalid login code");
			if (token.email !== email) throw new UnauthorisedError("Invalid login code");
			if (!isWithinExpirationDate(token.expiresAt))
				throw new UnauthorisedError("This token has expired, please request a new one");

			const session = await createTransaction(async () => {
				await Token.invalidateAllByUserId(token.userId);
				const { cookie, session } = await createSession(token.userId);
				const cookieList = cookies();
				cookieList.set(cookie);

				return session;
			});

			if (redirect_uri) return c.redirect(redirect_uri, 302);
			return c.json({ session }, 201);
		}
	)
	.post(
		"/logout",
		zValidator(
			"query",
			z.object({
				session: z.string().optional(),
			}),
			throwOnValidationError()
		),
		async (c) => {
			const { session: sessionId } = c.req.valid("query");
			const authSession = await session(sessionId);
			const auth = lucia();
			if (authSession) await auth.invalidateUserSessions(authSession.userId);

			const cookie = auth.createBlankSessionCookie();
			const cookieList = cookies();
			cookieList.delete(SESSION_COOKIE_NAME);
			cookieList.set(cookie);

			return c.json({ authSession });
		}
	);
