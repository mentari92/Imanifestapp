import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { QuranApiService } from '../common/quran-api.service';
import { QuranMcpService } from '../common/quran-mcp.service';

interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  versesCount: number;
}

interface ReciterInfo {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
}

@Injectable()
export class SakinahService {
  private readonly logger = new Logger(SakinahService.name);

  // Popular reciters curated list
  private readonly popularReciters: ReciterInfo[] = [
    {
      identifier: 'ar.abdurrahmaansudais',
      name: 'Abdurrahman As-Sudais',
      englishName: 'Abdurrahman As-Sudais',
      language: 'ar',
    },
    {
      identifier: 'ar.abdulbasitmurattal',
      name: 'Abdul Basit (Murattal)',
      englishName: 'Abdul Basit',
      language: 'ar',
    },
    {
      identifier: 'ar.misharyrashidalafasy',
      name: 'Mishary Rashid Alafasy',
      englishName: 'Mishary Rashid Alafasy',
      language: 'ar',
    },
    {
      identifier: 'ar.hudhaify',
      name: 'Ali Al-Hudhaify',
      englishName: 'Ali Al-Hudhaify',
      language: 'ar',
    },
    {
      identifier: 'ar.minshawi',
      name: 'Mohamed Siddiq El-Minshawi',
      englishName: 'Minshawi',
      language: 'ar',
    },
    {
      identifier: 'ar.husary',
      name: 'Mahmoud Khalil Al-Husary',
      englishName: 'Husary',
      language: 'ar',
    },
  ];

  constructor(
    private quranApiService: QuranApiService,
    private quranMcpService: QuranMcpService,
  ) {}

  async getSurahs(): Promise<SurahInfo[]> {
    // Try Quran API first
    const surahs = await this.quranApiService.getSurahs();
    if (surahs && surahs.length > 0) {
      return surahs.map((s) => ({
        number: s.number,
        name: s.name,
        englishName: s.englishName,
        versesCount: s.numberOfAyahs,
      }));
    }

    // Fallback: return hardcoded list of surah names
    this.logger.warn('Using fallback surah list');
    return this.getFallbackSurahs();
  }

  async getReciters(): Promise<ReciterInfo[]> {
    // Try to get from API, but use curated list as primary
    try {
      const editions = await this.quranApiService.getAudioEditions();
      if (editions && editions.length > 0) {
        // Filter to popular reciters or return all
        return editions.map((e) => ({
          identifier: e.identifier,
          name: e.name,
          englishName: e.englishName || e.name,
          language: e.language,
        }));
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get reciters from API: ${error instanceof Error ? error.message : error}`,
      );
    }
    return this.popularReciters;
  }

  async getAudioUrl(
    reciterIdentifierOrId: string | number,
    surahNumber: number,
  ): Promise<{ url: string }> {
    // Validate surah number
    if (surahNumber < 1 || surahNumber > 114) {
      throw new BadRequestException('Invalid surah number');
    }

    if (typeof reciterIdentifierOrId === 'number' && reciterIdentifierOrId <= 0) {
      throw new BadRequestException('Invalid reciter ID');
    }

    const reciterMap: Record<number, string> = {
      1: 'ar.abdulbasitmurattal',
      3: 'ar.abdurrahmaansudais',
      7: 'ar.alafasy',
    };
    const reciterIdentifier =
      typeof reciterIdentifierOrId === 'number'
        ? reciterMap[reciterIdentifierOrId] || 'ar.alafasy'
        : reciterIdentifierOrId;

    // Try Quran API first
    const url = await this.quranApiService.getAudioUrl(
      surahNumber,
      reciterIdentifier,
    );
    if (url) return { url };

    // Fallback: construct CDN URL
    const padded = String(surahNumber).padStart(3, '0');
    return {
      url: `https://cdn.islamic.network/quran/audio/128/${reciterIdentifier}/${padded}.mp3`,
    };
  }

  async getPopularReciters(): Promise<ReciterInfo[]> {
    return this.popularReciters;
  }

  private getFallbackSurahs(): SurahInfo[] {
    const surahNames = [
      { name: 'الفاتحة', englishName: 'Al-Fatiha', translation: 'The Opening' },
      { name: 'البقرة', englishName: 'Al-Baqara', translation: 'The Cow' },
      { name: 'آل عمران', englishName: 'Aal-Imran', translation: 'The Family of Imran' },
      { name: 'النساء', englishName: 'An-Nisa', translation: 'The Women' },
      { name: 'المائدة', englishName: 'Al-Maida', translation: 'The Table Spread' },
    ];
    return surahNames.map((s, i) => ({
      number: i + 1,
      name: s.name,
      englishName: s.englishName,
      versesCount: 0,
    }));
  }
}