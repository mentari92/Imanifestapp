import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SakinahService } from './sakinah.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('sakinah')
@UseGuards(JwtAuthGuard)
export class SakinahController {
  constructor(private readonly sakinahService: SakinahService) {}

  @Public()
  @Get('foundation-health')
  async getFoundationHealth() {
    const health = await this.sakinahService.getFoundationHealth();
    return { data: health };
  }

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
  ) {
    const surahNumber = parseInt(surah, 10);
    const reciterValue = /^\d+$/.test(reciter)
      ? parseInt(reciter, 10)
      : reciter;
    const result = await this.sakinahService.getAudioUrl(reciterValue, surahNumber);
    return result;
  }

  @Get('verse-audio-url')
  async getVerseAudioUrl(
    @Query('ayahKey') ayahKey: string,
    @Query('reciterId') reciterId: string,
  ) {
    const parsedReciterId = parseInt(reciterId, 10);
    const result = await this.sakinahService.getVerseAudioUrl(parsedReciterId, ayahKey);
    return result;
  }
}