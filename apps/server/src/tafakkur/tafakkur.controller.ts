import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TafakkurService } from './tafakkur.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('tafakkur')
@UseGuards(JwtAuthGuard)
export class TafakkurController {
  constructor(private readonly tafakkurService: TafakkurService) {}

  @Public()
  @Get('foundation-health')
  async getFoundationHealth() {
    const health = await this.tafakkurService.getFoundationHealth();
    return { data: health };
  }

  @Public()
  @Get('surahs')
  async getSurahs() {
    const surahs = await this.tafakkurService.getSurahs();
    return { data: surahs };
  }

  @Public()
  @Get('verses')
  async getVerses(@Query('surah') surah: string) {
    const surahNum = parseInt(surah, 10);
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      return { data: [] };
    }
    const verses = await this.tafakkurService.getVersesByChapter(surahNum);
    return { data: verses };
  }

  @Public()
  @Get('reciters')
  async getReciters() {
    const reciters = await this.tafakkurService.getReciters();
    return { data: reciters };
  }

  @Public()
  @Get('popular-reciters')
  async getPopularReciters() {
    const reciters = await this.tafakkurService.getPopularReciters();
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
    const result = await this.tafakkurService.getAudioUrl(reciterValue, surahNumber);
    return result;
  }

  @Get('verse-audio-url')
  async getVerseAudioUrl(
    @Query('ayahKey') ayahKey: string,
    @Query('reciterId') reciterId: string,
  ) {
    const parsedReciterId = parseInt(reciterId, 10);
    const result = await this.tafakkurService.getVerseAudioUrl(parsedReciterId, ayahKey);
    return result;
  }
}