import { randomUUID } from "node:crypto";

import { rest } from "msw";

import { server } from "../../setupTests";

import ResourceService from "./resourceService";

describe("ResourceService", () => {
	const service = new ResourceService();

	describe("getDrafts", () => {
		it("sends an appropriate GET request", async () => {
			let request;
			server.use(
				rest.get("/api/resources", (req, res, ctx) => {
					request = req;
					return res(ctx.json([]));
				})
			);
			await service.getDrafts();
			expect(request.url.searchParams.get("drafts")).toBe("true");
		});

		it("filters published resources out of the returned payload", async () => {
			const resources = [{ draft: true }, { draft: false }, { draft: true }];
			server.use(
				rest.get("/api/resources", (req, res, ctx) => {
					return res(ctx.json(resources));
				})
			);

			await expect(service.getDrafts()).resolves.toHaveLength(2);
		});

		it("returns an empty array on error", async () => {
			server.use(
				rest.get("/api/resources", (req, res, ctx) => res(ctx.status(400)))
			);
			await expect(service.getDrafts()).resolves.toEqual([]);
		});
	});

	describe("getPublished", () => {
		it("resolves with resources if request succeeds", async () => {
			const resources = [
				{ id: randomUUID(), title: "My Resource", url: "https://example.com" },
			];
			server.use(
				rest.get("/api/resources", (req, res, ctx) => res(ctx.json(resources)))
			);
			await expect(service.getPublished()).resolves.toEqual(resources);
		});

		it("resolves with empty array if request fails", async () => {
			server.use(
				rest.get("/api/resources", (req, res, ctx) => res(ctx.status(500)))
			);
			await expect(service.getPublished()).resolves.toEqual([]);
		});
	});

	describe("publish", () => {
		it("sends an appropriate PATCH request", async () => {
			let request;
			const id = "abc123";
			server.use(
				rest.patch("/api/resources/:id", async (req, res, ctx) => {
					request = req;
					return res(ctx.json({ draft: false }));
				})
			);
			await service.publish(id);
			expect(request.params.id).toBe(id);
			await expect(request.json()).resolves.toEqual({ draft: false });
		});
	});

	describe("suggest", () => {
		it("returns the resource on success", async () => {
			let request;
			const submitted = { title: "foo bar", url: "https://example.com" };
			const created = {
				...submitted,
				accession: new Date().toISOString(),
				draft: true,
			};
			server.use(
				rest.post("/api/resources", async (req, res, ctx) => {
					request = req;
					return res(ctx.status(201), ctx.json(created));
				})
			);
			await expect(service.suggest(submitted)).resolves.toEqual(created);
			await expect(request.json()).resolves.toEqual(submitted);
		});

		it("throws a useful error on conflict", async () => {
			server.use(
				rest.post("/api/resources", (req, res, ctx) => {
					return res(ctx.status(409));
				})
			);
			await expect(service.suggest({})).rejects.toThrow(
				"a very similar resource already exists"
			);
		});

		it("throws a useful error otherwise", async () => {
			server.use(
				rest.post("/api/resources", (req, res, ctx) => {
					return res(ctx.status(401));
				})
			);
			await expect(service.suggest({})).rejects.toThrow("something went wrong");
		});
	});
});
