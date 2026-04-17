import { Module } from "@nestjs/common";
import { SakinahController } from "./sakinah.controller";
import { SakinahService } from "./sakinah.service";
import { QuranApiService } from "../common/quran-api.service";
import { QuranMcpService } from "../common/quran-mcp.service";
import { RedisService } from "../common/redis.service";

@Module({
  controllers: [SakinahController],
  providers: [SakinahService, QuranApiService, QuranMcpService, RedisService],
})
export class SakinahModule {}