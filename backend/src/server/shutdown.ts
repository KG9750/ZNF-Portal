import type { Server } from "node:http";
import type { PrismaClient } from "@prisma/client";

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function shutdownServer(server: Server, prisma: PrismaClient): Promise<void> {
  await closeServer(server);
  await prisma.$disconnect();
}
