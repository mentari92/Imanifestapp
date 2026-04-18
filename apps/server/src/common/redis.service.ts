import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  async onModuleInit() {
    try {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 2) {
            return null;
          }
          return Math.min(times * 500, 1000);
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
        `Redis connection failed - operating in fallback mode: ${error instanceof Error ? error.message : error}`,
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

  isAvailable(): boolean {
    return this.connected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for key "${key}": ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

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

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${error instanceof Error ? error.message : error}`);
    }
  }

  async incr(key: string, windowSeconds?: number): Promise<number> {
    if (!this.client) return 0;
    try {
      const count = await this.client.incr(key);
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
