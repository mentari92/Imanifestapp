import { Controller, Get } from "@nestjs/common";
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

    return {
      status: database === "connected" ? "ok" : "degraded",
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
        imanifest: "POST /imanifest/analyze",
        duaTodo: "POST /dua-to-do/generate",
        qalb: "POST /qalb/reflect",
        tafakkur: {
          reciters: "GET /tafakkur/reciters",
          surahs: "GET /tafakkur/surahs",
          audio: "GET /tafakkur/audio-url",
        },
        dashboard: "GET /dashboard/overview (requires auth)",
      },
    };
  }
}