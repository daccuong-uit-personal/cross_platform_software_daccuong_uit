import { PrismaClient } from '@prisma/client';

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

declare global {
  // Allow global `var` declarations in development to avoid multiple instances
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Creates a singleton PrismaClient instance.
 * In development, reuses a global instance to avoid exhausting DB connections
 * due to hot module reloading (e.g., ts-node-dev / nodemon).
 *
 * Each service should call this once at startup and pass the client around via DI.
 */
export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient(options);
  }

  if (!global.__prismaClient) {
    global.__prismaClient = new PrismaClient(options);
  }

  return global.__prismaClient;
}

export { PrismaClient };
