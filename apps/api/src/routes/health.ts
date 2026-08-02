import type { FastifyInstance } from "fastify"

export const registerHealthRoutes = (app: FastifyInstance) => {
  app.get("/health", async () => ({
    ok: true,
    service: "jxtento-api",
    version: "0.1.0"
  }))

  app.get("/", async () => ({
    name: "JXtento API",
    status: "read-only",
    docs: "/health"
  }))
}
