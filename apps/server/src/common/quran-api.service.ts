import { Injectable } from "@nestjs/common";

/**
 * Placeholder Quran Foundation API client.
 * Will be implemented in Story 2.1 (ImanSync Text Analysis).
 */
@Injectable()
export class QuranApiService {
  private readonly baseUrl = "https://api.quran.com/api/v4";

  async searchVerses(query: string): Promise<unknown[]> {
    // Placeholder — returns empty
    return [];
  }

  async getVerseWithTranslation(verseKey: string): Promise<unknown | null> {
    // Placeholder
    return null;
  }
}