import { WorkerEntrypoint } from "cloudflare:workers";
import { cloudflare } from "@galaxiajs/cloudflare-kit";

export default class extends cloudflare(WorkerEntrypoint) {
	fetch(_request: Request) {
		return Response.json({ message: "Hello" });
	}
}
