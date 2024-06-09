import { cloudflare } from "@galaxiajs/cloudflare-kit";

export default cloudflare({
	fetch(_request: Request) {
		return Response.json({ message: "Hello" });
	},
});
