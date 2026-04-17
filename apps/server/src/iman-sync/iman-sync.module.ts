import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ImanSyncController } from "./iman-sync.controller";
import { ImanSyncService } from "./iman-sync.service";
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
  controllers: [ImanSyncController],
  providers: [ImanSyncService, ZhipuService, QuranApiService, QuranMcpService],
})
export class ImanSyncModule {}