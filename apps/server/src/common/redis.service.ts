import { Injectable, OnModuleDestroy } from "@nestjs/common";

/**
 * Placeholder Redis service.
 * Will be implemented in Story 2.3 (Rate Limiting).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: unknown = null;

  async get(key: string): Promise<string | null> {
    // Placeholder
    return null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    // Placeholder
  }

  async del(key: string): Promise<void> {
    // Placeholder
  }

  async onModuleDestroy() {
    // Cleanup placeholder
  }
}