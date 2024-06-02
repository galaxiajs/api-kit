import { RecordNotFoundError, UniqueConstraintFailed } from "db/utils/exceptions";

export class UserNotFound extends RecordNotFoundError {
	constructor(
		readonly fieldName: string,
		readonly fieldValue: string
	) {
		super("user", fieldName, fieldValue);
		this.name = "UserNotFound";
	}
}

export class UserUsernameTaken extends UniqueConstraintFailed {
	constructor(readonly fieldValue: string) {
		super("user", "username", fieldValue);
		this.name = "UserUsernameTaken";
	}
}

export class UserEmailTaken extends UniqueConstraintFailed {
	constructor(readonly fieldValue: string) {
		super("user", "email", fieldValue);
		this.name = "UserEmailTaken";
	}
}
