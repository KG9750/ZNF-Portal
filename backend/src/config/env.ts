export interface BackendConfig {
  databaseUrl: string;
  nodeEnv: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const rawPort = env.PORT ?? "3000";
  const port = Number.parseInt(rawPort, 10);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    databaseUrl: env.DATABASE_URL ?? "file:./dev.db",
    nodeEnv: env.NODE_ENV ?? "development",
    port
  };
}
