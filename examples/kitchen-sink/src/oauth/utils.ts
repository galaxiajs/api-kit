import { searchParams } from "@pulsar/cloudflare";
import { cookies } from "@pulsar/cloudflare/cookies";
import type { Tokens } from "arctic";
import { InvalidCallbackStateError, OAuthError } from "./exceptions";
import type { BaseProvider } from "./types";

export const OAuthCookies = {
	PKCE: "code_verifier",
} as const;

export function getTokens(provider: BaseProvider): Promise<Tokens> {
	const cookieList = cookies();
	const stateCookie = cookieList.get(provider.cookieName);

	const params = searchParams();
	const state = params.get("state");
	const code = params.get("code");

	if (!state || !code || !stateCookie || stateCookie?.value !== state) {
		const error = params.get("error");
		const errorDescription = params.get("error_description");

		if (error && errorDescription) {
			const errorUri = params.get("error_uri");
			throw new OAuthError(error, errorDescription, errorUri);
		}

		throw new InvalidCallbackStateError();
	}

	if (provider.pkce) {
		const codeVerifier = cookieList.get(OAuthCookies.PKCE);
		if (!codeVerifier) throw new InvalidCallbackStateError("Missing PKCE verifier");

		return provider.validateAuthorizationCode(code, codeVerifier.value);
	}

	return provider.validateAuthorizationCode(code);
}
