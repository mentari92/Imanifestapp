import { Module } from "@nestjs/common";
import { SakinahController } from "./sakinah.controller";
import { SakinahService } from "./sakinah.service";

@Module({
  controllers: [SakinahController],
  providers: [SakinahService],
})
export class SakinahModule {}