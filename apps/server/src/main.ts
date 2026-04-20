import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { PrismaService } from "@imanifest/database";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // App is behind reverse proxies (Cloudflare/nginx/Caddy), so trust forwarded IP headers.
  app.getHttpAdapter().getInstance().set("trust proxy", true);

  // Enable DTO validation globally (class-validator + class-transformer)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Required for PrismaService onModuleDestroy to fire
  app.enableShutdownHooks();

  app.enableCors({
    origin: [
      "http://localhost:3001",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:8083",
      "http://localhost:19006",
      "exp://localhost:8081",
      "https://imanifestapp.com",
      "https://www.imanifestapp.com",
      "https://api.imanifestapp.com",
    ],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  // SEED DEMO USER FOR HACKATHON (non-blocking)
  const prisma = app.get(PrismaService);
  if (prisma.isConnected) {
    try {
      await prisma.user.upsert({
        where: { email: "mentari@imanifestapp.com" },
        update: {},
        create: {
          id: "demo-user-123",
          email: "mentari@imanifestapp.com",
          name: "Mentari",
        },
      });
      console.log("✅ Demo User Seeded for Hackathon");
    } catch (err: any) {
      console.warn("⚠️ Could not seed demo user:", err?.message || err);
    }
  } else {
    console.log("ℹ️ Database not available — running in demo mode (no persistence)");
  }

  console.log(`🚀 Imanifest server running on http://localhost:${port}`);
}

bootstrap();