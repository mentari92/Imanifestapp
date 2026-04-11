import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      "http://localhost:8081",
      "http://localhost:19006",
      "exp://localhost:8081",
      "https://imanifestapp.com",
      "https://api.imanifestapp.com",
    ],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Imanifest server running on http://localhost:${port}`);
}

bootstrap();