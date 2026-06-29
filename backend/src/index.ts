import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createPrismaClient } from "./prisma/client.js";
import { shutdownServer } from "./server/shutdown.js";

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(`ZNF-Portal backend listening on port ${config.port}`);
});

process.on("SIGINT", () => {
  void shutdownServer(server, prisma).then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdownServer(server, prisma).then(() => process.exit(0));
});
