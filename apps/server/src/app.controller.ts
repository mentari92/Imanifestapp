import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/public.decorator";

@Controller()
export class AppController {
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
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
        imanSync: "POST /iman-sync/analyze",
        duaTodo: "POST /dua-to-do/generate",
        heartPulse: "POST /heart-pulse/reflect",
        sakinah: {
          reciters: "GET /sakinah/reciters",
          surahs: "GET /sakinah/surahs",
          audio: "GET /sakinah/audio",
        },
        dashboard: "GET /dashboard/overview (requires auth)",
      },
    };
  }
}