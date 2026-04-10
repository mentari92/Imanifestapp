import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Redis service backed by ioredis.
 * Used for caching (ImanSync results, Quran API) and rate limiting.
 * Gracefully degrades if Redis is unavailable — never crashes the app.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  async onModuleInit() {
    try {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 5) {
            // Stop retrying after 5 attempts
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on("connect", () => {
        this.connected = true;
        this.logger.log("Redis connected");
      });

      this.client.on("error", (err) => {
        this.connected = false;
        this.logger.warn(`Redis error: ${err.message}`);
      });

      this.client.on("close", () => {
        this.connected = false;
        this.logger.warn("Redis connection closed");
      });

      await this.client.connect();
    } catch (error) {
      this.logger.warn(
        `Redis connection failed — operating in fallback mode: ${error instanceof Error ? error.message : error}`,
      );
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }

  /** Check if Redis is available */
  isAvailable(): boolean {
    return this.connected && this.client !== null;
  }

  /** Get a value from Redis. Returns null if not found or Redis unavailable. */
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for key "${key}": ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /** Set a value in Redis with optional TTL in seconds. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.warn(`Redis SET failed for key "${key}": ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Delete a key from Redis. */
  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Increment a counter and set TTL on first creation.
   * Returns the new count after increment.
   * Used for rate limiting.
   */
  async incr(key: string, windowSeconds?: number): Promise<number> {
    if (!this.client) return 0;
    try {
      const count = await this.client.incr(key);
      // Set TTL only on first increment (count === 1)
      if (count === 1 && windowSeconds) {
        await this.client.expire(key, windowSeconds);
      }
      return count;
    } catch (error) {
      this.logger.warn(`Redis INCR failed for key "${key}": ${error instanceof Error ? error.message : error}`);
      return 0;
    }
  }
}