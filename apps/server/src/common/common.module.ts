import { Global, Module } from '@nestjs/common';
import { ZhipuService } from './zhipu.service';
import { QuranApiService } from './quran-api.service';
import { QuranMcpService } from './quran-mcp.service';
import { RedisModule } from './redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [ZhipuService, QuranApiService, QuranMcpService],
  exports: [ZhipuService, QuranApiService, QuranMcpService],
})
export class CommonModule {}