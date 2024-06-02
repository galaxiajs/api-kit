import { createConnection } from "db/client";
import { seeds } from "db/models/seed.sql";
import dotenv from "dotenv";

const { parsed: env = {} } = dotenv.config({ path: "./.dev.vars" });

async function main() {
	console.log("Seeding database");
	const { db } = createConnection({
		url: env.DatabaseUrl,
		authToken: env.DatabaseSecret,
	});

	const seeded = await db.query.seeds.findFirst();

	if (seeded) {
		console.info("Database has already been seeded. 🌱");
		return;
	}

	await db.insert(seeds).values({ isSeeded: true }).execute();
	console.info("Database has been seeded. 🌱");
	process.exit(0);
}

main().catch((e) => {
	console.error("Seeding failed");
	console.error(e);
	process.exit(1);
});
