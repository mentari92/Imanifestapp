import { Module } from "@nestjs/common";
import { HeartPulseController } from "./heart-pulse.controller";
import { HeartPulseService } from "./heart-pulse.service";
import { ZhipuService } from "../common/zhipu.service";

@Module({
  controllers: [HeartPulseController],
  providers: [HeartPulseService, ZhipuService],
})
export class HeartPulseModule {}