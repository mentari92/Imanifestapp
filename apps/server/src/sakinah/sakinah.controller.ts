import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SakinahService } from './sakinah.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('sakinah')
@UseGuards(JwtAuthGuard)
export class SakinahController {
  constructor(private readonly sakinahService: SakinahService) {}

  @Get('surahs')
  async getSurahs() {
    const surahs = await this.sakinahService.getSurahs();
    return { data: surahs };
  }

  @Get('reciters')
  async getReciters() {
    const reciters = await this.sakinahService.getReciters();
    return { data: reciters };
  }

  @Get('popular-reciters')
  async getPopularReciters() {
    const reciters = await this.sakinahService.getPopularReciters();
    return { data: reciters };
  }

  @Get('audio-url')
  async getAudioUrl(
    @Query('surah') surah: string,
    @Query('reciter') reciter: string,
    @Request() req: any,
  ) {
    const surahNumber = parseInt(surah, 10);
    const reciterValue = /^\d+$/.test(reciter)
      ? parseInt(reciter, 10)
      : reciter;
    const url = await this.sakinahService.getAudioUrl(reciterValue, surahNumber);
    return { url };
  }
}