import { locals } from "@galaxiajs/cloudflare-kit";
import { cookies } from "@galaxiajs/cloudflare-kit/cookies";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Session } from "db/models/session";
import { session as dbSession } from "db/models/session/session.sql";
import { User } from "db/models/user/schemas";
import { user } from "db/models/user/user.sql";
import {
	Cookie,
	type CookieAttributes,
	Lucia,
	type Session as LuciaSession,
	type RegisteredLucia,
	TimeSpan,
} from "lucia";
import { dev, preview } from "src/utils/context";
import { UnauthorisedError } from "./exceptions";

declare module "lucia" {
	interface Register {
		Lucia: Lucia<Session.Info, User.Info>;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}

	interface DatabaseUserAttributes extends User.Info {}
}

export interface AuthSession extends LuciaSession {
	user: User.Info;
}

export const SESSION_COOKIE_NAME = "auth_session";

/**
 * **This must be called inside a route handler, not at the module top-level**
 * @returns Cookie options accounting for when in dev mode.
 */
export function useCookieOptions() {
	return {
		httpOnly: true,
		secure: !(dev() || preview()),
		sameSite: "lax",
		path: "/",
		maxAge: new TimeSpan(10, "m").seconds(),
	} satisfies CookieAttributes;
}

export function lucia(): RegisteredLucia {
	const { db } = locals();
	const adapter = new DrizzleSQLiteAdapter(db, dbSession, user);
	const cookieOptions = useCookieOptions();

	return new Lucia(adapter, {
		sessionExpiresIn: new TimeSpan(2, "w"),
		sessionCookie: {
			name: SESSION_COOKIE_NAME,
			attributes: {
				secure: cookieOptions.secure,
				path: cookieOptions.path,
				sameSite: cookieOptions.sameSite,
			},
		},
		getUserAttributes(databaseUser) {
			return {
				username: databaseUser.username,
				email: databaseUser.email,
				emailVerified: databaseUser.emailVerified,
				avatarUrl: databaseUser.avatarUrl,
				createdAt: databaseUser.createdAt,
				updatedAt: databaseUser.updatedAt,
				deletedAt: databaseUser.deletedAt,
			} satisfies Omit<User.Info, "id">;
		},
	});
}

export async function session(session_id?: string): Promise<AuthSession | null> {
	const cookieList = cookies();
	const sessionId = session_id ?? cookieList.get(SESSION_COOKIE_NAME)?.value;
	if (!sessionId) return null;

	const auth = lucia();
	const { session, user } = await auth.validateSession(sessionId);

	if (!session) {
		const cookie = auth.createBlankSessionCookie();
		cookieList.set(cookie);
		return null;
	}

	if (session.fresh) {
		const cookie = auth.createSessionCookie(session.id);
		cookieList.set(cookie);
	}

	return Object.assign(session, { user });
}

export async function requireSession(errMsg?: string): Promise<AuthSession> {
	const authSession = await session();
	if (!authSession) throw new UnauthorisedError(errMsg);

	return authSession;
}

export async function createSession(
	userId: string
): Promise<{ session: LuciaSession; cookie: Cookie }> {
	const auth = lucia();
	const session = await auth.createSession(userId, {});
	const cookie = auth.createSessionCookie(session.id);
	const cookieList = cookies();
	cookieList.set(cookie);

	return { session, cookie };
}
