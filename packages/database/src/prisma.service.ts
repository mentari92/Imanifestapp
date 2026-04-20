import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private _connected = false;

  get isConnected() {
    return this._connected;
  }

  async onModuleInit() {
    const maxAttempts = 10;
    const delayMs = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this._connected = true;
        this.logger.log("✅ Database connected successfully");
        return;
      } catch (err: any) {
        this.logger.warn(
          `⚠️ DB connect attempt ${attempt}/${maxAttempts} failed: ${err?.message || err}`,
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this._connected = false;
    this.logger.error(
      "❌ Database connection permanently failed after all retries — running without persistence",
    );
  }

  async onModuleDestroy() {
    if (this._connected) {
      await this.$disconnect();
    }
  }
}