import { OTP_CODE_LENGTH } from "db/models/token/constants";
import { Token } from "db/models/token/schema";
import { TimeSpan } from "lucia";
import { createDate } from "oslo";
import { alphabet, generateRandomString } from "oslo/crypto";

export function generateOTP(): Pick<Token.Info, "code" | "expiresAt"> {
	const code = generateRandomString(OTP_CODE_LENGTH, alphabet("0-9"));
	return {
		code,
		expiresAt: createDate(new TimeSpan(5, "m")),
	};
}
