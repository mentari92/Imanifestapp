import { Module } from "@nestjs/common";
import { TafakkurController } from "./tafakkur.controller";
import { TafakkurService } from "./tafakkur.service";
import { QuranApiService } from "../common/quran-api.service";
import { QuranMcpService } from "../common/quran-mcp.service";
import { RedisService } from "../common/redis.service";

@Module({
  controllers: [TafakkurController],
  providers: [TafakkurService, QuranApiService, QuranMcpService, RedisService],
})
export class TafakkurModule {}