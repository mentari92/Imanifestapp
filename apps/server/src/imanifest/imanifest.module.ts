import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ImanifestController } from "./imanifest.controller";
import { ImanifestService } from "./imanifest.service";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";
import { QuranMcpService } from "../common/quran-mcp.service";

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  ],
  controllers: [ImanifestController],
  providers: [ImanifestService, ZhipuService, QuranApiService, QuranMcpService],
})
export class ImanifestModule {}