import { env } from "@galaxiajs/cloudflare-kit";
import { bindings, locals, waitUntil } from "@galaxiajs/cloudflare-kit";
import { cookies } from "@galaxiajs/cloudflare-kit/cookies";
import { generateCodeVerifier, generateState } from "arctic";
import { OAuth as OAuthRepository } from "db/models/oauth/repository";
import { OAuth } from "db/models/oauth/schemas";
import { User as UserRepository } from "db/models/user/repository";
import { User } from "db/models/user/schemas";
import { createTransaction } from "db/utils/transaction";
import { type Context, Hono } from "hono";
import { createSession, useCookieOptions } from "src/auth/auth";
import { UnknownProviderError } from "src/oauth/exceptions";
import { useOAuthProviders } from "src/oauth/providers";
import { OAuthCookies, getTokens } from "src/oauth/utils";

export const oauthRoutes = new Hono()
	.post("/:providerId/login", async (c) => {
		return await handle(c, async () => {
			const { provider } = getProvider(c);
			const state = generateState();
			let url: URL;

			const cookieOptions = useCookieOptions();
			const cookieList = cookies();
			cookieList.set(provider.cookieName, state, cookieOptions);

			if (provider.pkce) {
				const verifier = generateCodeVerifier();
				cookieList.set(OAuthCookies.PKCE, verifier, cookieOptions);
				url = await provider.createAuthorizationURL(state, verifier);
			} else {
				url = await provider.createAuthorizationURL(state);
			}

			return c.redirect(url.toString(), 302);
		});
	})
	.get("/:providerId/callback", async (c) => {
		return await handle(c, async () => {
			const { provider, providerId } = getProvider(c);
			const { accessToken } = await getTokens(provider);
			const { providerUserId, ...user } = await provider.getUser(accessToken);

			const account: Omit<OAuth.Create, "userId"> = { providerId, providerUserId };
			const oauthAccount = await OAuthRepository.fromProviderUserID(account);
			const userId = oauthAccount?.userId ?? (await createUser({ user, account }));

			const cookieList = cookies();
			cookieList.delete([provider.cookieName, OAuthCookies.PKCE]);
			await createSession(userId);

			const { WebAppUrl } = env();
			return c.redirect(`${WebAppUrl}/auth/success`, 302);
		});
	});

function getProvider(c: Context<any, `${string}/:providerId`>) {
	const providers = useOAuthProviders();
	const providerId = c.req.param("providerId");
	if (!(providerId in providers)) throw new UnknownProviderError(providerId);

	// @ts-expect-error really ...
	const provider = providers[providerId];
	return { provider, providerId };
}

async function handle<C extends Context, Out>(c: C, callback: () => Out | Promise<Out>) {
	try {
		return await callback();
	} catch (error) {
		const { sentry } = locals();
		sentry.captureException(error);

		const { WebAppUrl } = env();
		const redirectTo = new URL("/auth/error", WebAppUrl);
		redirectTo.searchParams.set("error", JSON.stringify(error));
		return c.redirect(redirectTo.toString(), 302);
	}
}

async function createUser({ user, account }: User.OAuth) {
	const id = await createTransaction(() =>
		UserRepository.createFromOAuth({ user, account })
	);

	const { Mailer } = bindings();
	waitUntil(Mailer.sendWelcomeEmail({ email: user.email, name: user.username }));

	return id;
}
