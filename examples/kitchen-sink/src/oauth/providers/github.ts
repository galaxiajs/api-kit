import { GitHub as GithubAuth } from "arctic";
import * as z from "zod";
import { type BaseProvider, OAuth2User, type ProviderOptions } from "../types";

const EmailResponse = z.array(
	OAuth2User.pick({ email: true }).extend({
		verified: z.boolean(),
		primary: z.boolean(),
	})
);

const UserResponse = z.object({
	id: z.coerce.string(),
	login: z.string(),
	avatar_url: z.string().url(),
});

export class GitHub extends GithubAuth implements BaseProvider<GithubAuth> {
	public readonly pkce = false;
	public readonly id = "github";
	public readonly name = "GitHub";
	public readonly cookieName = "github_oauth_state";
	public readonly scopes: string[];

	constructor({ clientId, clientSecret, redirectURI, scopes = [] }: ProviderOptions) {
		super(clientId, clientSecret, { redirectURI });

		this.scopes = scopes;
	}

	public createAuthorizationURL(
		state: string,
		{ scopes = [] }: { scopes?: string[] } = {}
	): Promise<URL> {
		return super.createAuthorizationURL(state, {
			scopes: [...scopes, ...this.scopes],
		});
	}

	public async getUser(accessToken: string): Promise<OAuth2User> {
		const headers = {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${accessToken}`,
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "pulsar-app",
		};

		const [userResponse, emailsResponse] = await Promise.all([
			fetch("https://api.github.com/user", { headers }).then((res) => res.json()),
			fetch("https://api.github.com/user/emails", { headers }).then((res) => res.json()),
		]);

		const emails = EmailResponse.parse(emailsResponse);
		const primaryEmail = emails.find((e) => e.primary) ?? emails[0];
		const { email, verified } = primaryEmail;
		const { login, avatar_url, id } = UserResponse.parse(userResponse);
		return {
			username: login,
			email,
			providerUserId: id,
			emailVerified: verified ? new Date() : null,
			avatarUrl: avatar_url,
		};
	}
}
