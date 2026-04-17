import { Module } from "@nestjs/common";
import { DuaToDoController } from "./dua-todo.controller";
import { DuaToDoService } from "./dua-todo.service";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";
import { QuranMcpService } from "../common/quran-mcp.service";
@Module({
  controllers: [DuaToDoController],
  providers: [DuaToDoService, ZhipuService, QuranApiService, QuranMcpService],
})
export class DuaToDoModule {}
