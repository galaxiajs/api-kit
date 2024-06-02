export class UnknownProviderError extends Error {
	constructor(providerId: string) {
		super(`Unknown OAuth provider "${providerId}"`);

		this.name = "UnknownProviderError";
	}
}

export class InvalidCallbackStateError extends Error {
	constructor(message = "Invalid OAuth callback state") {
		super(message);

		this.name = "InvalidCallbackStateError";
	}
}

export class OAuthError extends Error {
	constructor(
		public readonly code: string,
		public readonly message: string,
		public readonly uri?: string | null
	) {
		super(message);

		this.name = "OAuthError";
	}
}
