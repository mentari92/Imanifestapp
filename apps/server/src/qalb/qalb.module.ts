import { Module } from "@nestjs/common";
import { QalbController } from "./qalb.controller";
import { QalbService } from "./qalb.service";
import { ZhipuService } from "../common/zhipu.service";

@Module({
  controllers: [QalbController],
  providers: [QalbService, ZhipuService],
})
export class QalbModule {}