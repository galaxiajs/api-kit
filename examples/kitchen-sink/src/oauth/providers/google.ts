import { Google as GoogleAuth } from "arctic";
import * as z from "zod";
import { type BaseProvider, OAuth2User, type ProviderOptions } from "../types";

const UserInfo = OAuth2User.pick({ email: true }).extend({
	sub: z.string(),
	picture: z.string(),
	email_verified: z.boolean(),
});

export class Google extends GoogleAuth implements BaseProvider<GoogleAuth> {
	public readonly pkce = true;
	public readonly id = "google";
	public readonly name = "Google";
	public readonly cookieName = "google_oauth_state";
	public readonly scopes: string[];

	constructor({ clientId, clientSecret, redirectURI, scopes = [] }: ProviderOptions) {
		super(clientId, clientSecret, redirectURI);

		this.scopes = scopes;
	}

	public createAuthorizationURL(
		state: string,
		codeVerifier: string,
		{ scopes = [] }: { scopes?: string[] } = {}
	): Promise<URL> {
		return super.createAuthorizationURL(state, codeVerifier, {
			scopes: [...scopes, ...this.scopes],
		});
	}

	public async getUser(accessToken: string): Promise<OAuth2User> {
		const data = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"User-Agent": "pulsar-app",
			},
		}).then((res) => res.json());

		const { sub, picture, email, email_verified } = UserInfo.parse(data);
		return {
			username: email.split("@")[0],
			avatarUrl: picture,
			providerUserId: sub,
			email,
			emailVerified: email_verified ? new Date() : null,
		};
	}
}
