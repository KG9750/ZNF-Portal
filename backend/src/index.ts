import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createPrismaClient } from "./prisma/client.js";

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(`ZNF-Portal backend listening on port ${config.port}`);
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  void shutdown().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().then(() => process.exit(0));
});
