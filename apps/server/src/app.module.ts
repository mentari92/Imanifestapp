import { Module } from "@nestjs/common";
import { DatabaseModule } from "@imanifest/database";

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
