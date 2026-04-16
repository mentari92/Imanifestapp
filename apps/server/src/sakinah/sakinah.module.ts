import { Module } from "@nestjs/common";
import { SakinahController } from "./sakinah.controller";
import { SakinahService } from "./sakinah.service";
import { QuranApiService } from "../common/quran-api.service";
import { RedisService } from "../common/redis.service";

@Module({
  controllers: [SakinahController],
  providers: [SakinahService, QuranApiService, RedisService],
})
export class SakinahModule {}