import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "@imanifest/database";
import { Public } from "./auth/public.decorator";
import { RedisService } from "./common/redis.service";

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  welcome() {
    return {
      name: "ImanifestApp API",
      status: "running",
      docs: "/api-info",
      health: "/health",
      frontendLocal: "http://localhost:8081",
      note: "Use port 8081 for frontend, port 3001 for backend API only.",
    };
  }

  @Public()
  @Get("health")
  health() {
    const database = this.prisma.isConnected ? "connected" : "disconnected";
    const redis = this.redis.isAvailable() ? "connected" : "degraded";

    if (database !== "connected") {
      throw new HttpException(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          dependencies: { database, redis },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: { database, redis },
    };
  }

  @Public()
  @Get("api-info")
  apiInfo() {
    return {
      name: "ImanifestApp API",
      version: "1.0.0",
      status: "running",
      endpoints: {
        auth: { register: "POST /auth/register", login: "POST /auth/login" },
        imanifest: "POST /iman-sync/analyze",
        duaTodo: "POST /dua-to-do/generate",
        qalb: "POST /heart-pulse/reflect",
        tafakkur: {
          reciters: "GET /sakinah/reciters",
          surahs: "GET /sakinah/surahs",
          audio: "GET /sakinah/audio",
        },
        dashboard: "GET /dashboard/overview (requires auth)",
      },
    };
  }
}