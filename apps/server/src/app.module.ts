import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "@imanifest/database";
import { RedisModule } from "./common/redis.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/auth.guard";
import { ImanSyncModule } from "./iman-sync/iman-sync.module";
import { DuaToDoModule } from "./dua-todo/dua-todo.module";
import { HeartPulseModule } from "./heart-pulse/heart-pulse.module";
import { SakinahModule } from "./sakinah/sakinah.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AppController } from "./app.controller";

@Module({
  imports: [DatabaseModule, RedisModule, AuthModule, ImanSyncModule, DuaToDoModule, HeartPulseModule, SakinahModule, DashboardModule],
  controllers: [AppController],
  providers: [
    // Apply JWT guard globally — use @Public() to skip
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}