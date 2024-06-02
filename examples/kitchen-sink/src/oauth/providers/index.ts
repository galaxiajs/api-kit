import { url, env } from "@pulsar/cloudflare";
import { GitHub } from "./github";
import { Google } from "./google";

export function useOAuthProviders() {
	const { origin } = url();
	const secrets = env();
	const callback = (id: string) => `${origin}/oauth/${id}/callback`;
	return {
		github: new GitHub({
			redirectURI: callback("github"),
			scopes: ["user:email"],
			clientId: secrets.GithubClientId,
			clientSecret: secrets.GithubClientSecret,
		}),
		google: new Google({
			redirectURI: callback("google"),
			scopes: [
				"https://www.googleapis.com/auth/userinfo.profile",
				"https://www.googleapis.com/auth/userinfo.email",
			],
			clientId: secrets.GoogleClientId,
			clientSecret: secrets.GoogleClientSecret,
		}),
	};
}
