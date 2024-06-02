import type { OAuth2Provider, OAuth2ProviderWithPKCE } from "arctic";
import { User } from "db/models/user/schemas";
import * as z from "zod";

export type OAuth2User = z.infer<typeof OAuth2User>;
export const OAuth2User = User.Info.pick({
	username: true,
	avatarUrl: true,
	email: true,
	emailVerified: true,
}).extend({
	providerUserId: z.string(),
});

type AnyProvider = OAuth2Provider | OAuth2ProviderWithPKCE;

export type BaseProvider<TBase extends AnyProvider = AnyProvider> =
	(TBase extends OAuth2Provider ? TBase & { pkce: false } : TBase & { pkce: true }) & {
		readonly id: string;
		readonly name: string;
		readonly scopes: string[];
		readonly cookieName: string;
		getUser(accessToken: string): Promise<OAuth2User>;
	};

export interface ProviderOptions {
	clientId: string;
	clientSecret: string;
	redirectURI: string;
	scopes?: string[];
}
