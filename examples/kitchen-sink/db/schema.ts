import * as oauth from "./models/oauth/oauth.sql";
import * as seed from "./models/seed.sql";
import * as session from "./models/session/session.sql";
import * as token from "./models/token/token.sql";
import * as user from "./models/user/user.sql";

export const schema = {
	...user,
	...session,
	...oauth,
	...token,
	...seed,
};

export type AppSchema = typeof schema;
