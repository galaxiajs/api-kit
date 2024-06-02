export class UnauthorisedError extends Error {
	constructor(message = "You must be signed in to access this resource") {
		super(message);

		this.name = "UnauthorisedError";
	}
}
