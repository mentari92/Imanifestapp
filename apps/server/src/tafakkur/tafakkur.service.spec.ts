import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { TafakkurService } from "./tafakkur.service";
import { RedisService } from "../common/redis.service";
import { QuranApiService } from "../common/quran-api.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("TafakkurService", () => {
  let service: TafakkurService;
  let redis: RedisService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockQuranApi = {
    getVerseWithTranslation: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TafakkurService,
        { provide: RedisService, useValue: mockRedis },
        { provide: QuranApiService, useValue: mockQuranApi },
      ],
    }).compile();

    service = module.get<TafakkurService>(TafakkurService);
    redis = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─── getReciters ───────────────────────────────────────────

  describe("getReciters", () => {
    const mockRecitersApi = [
      { id: 7, reciter_name: "Mishary Rashid Alafasy", style: "Murattal" },
      { id: 1, reciter_name: "Abdul Basit", style: "Murattal" },
    ];

    it("should return cached reciters when Redis has data", async () => {
      const cachedReciters = [
        { id: 7, name: "Mishary Rashid Alafasy", arabicName: "", style: "Murattal" },
      ];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedReciters));

      const result = await service.getReciters();

      expect(result).toEqual(cachedReciters);
      expect(redis.get).toHaveBeenCalledWith("tafakkur:reciters");
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should fetch from API and cache when Redis is empty", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: { recitations: mockRecitersApi },
      });

      const result = await service.getReciters();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Mishary Rashid Alafasy");
      expect(result[1].name).toBe("Abdul Basit");
      expect(redis.set).toHaveBeenCalledWith(
        "tafakkur:reciters",
        expect.any(String),
        86400,
      );
    });

    it("should return fallback reciters when API fails", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getReciters();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("Mishary Rashid Alafasy");
      expect(result[1].name).toBe("Abdul Basit");
      expect(result[2].name).toBe("Abdurrahmaan As-Sudais");
    });

    it("should return API data even when Redis get throws", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis down"));
      mockedAxios.get.mockResolvedValueOnce({
        data: { recitations: mockRecitersApi },
      });

      const result = await service.getReciters();

      expect(result).toHaveLength(2);
    });

    it("should cache fallback reciters when API fails", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await service.getReciters();

      // Fire-and-forget set — still called
      expect(redis.set).toHaveBeenCalledWith(
        "tafakkur:reciters",
        expect.any(String),
        86400,
      );
    });
  });

  // ─── getAudioUrl ───────────────────────────────────────────

  describe("getAudioUrl", () => {
    it("should throw BadRequestException for surah number < 1", async () => {
      await expect(service.getAudioUrl(7, 0)).rejects.toThrow(BadRequestException);
      await expect(service.getAudioUrl(7, 0)).rejects.toThrow("Invalid surah number");
    });

    it("should throw BadRequestException for surah number > 114", async () => {
      await expect(service.getAudioUrl(7, 115)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for reciterId <= 0", async () => {
      await expect(service.getAudioUrl(0, 1)).rejects.toThrow(BadRequestException);
      await expect(service.getAudioUrl(-1, 1)).rejects.toThrow("Invalid reciter ID");
    });

    it("should return cached audio URL when Redis has data", async () => {
      const cachedUrl = { url: "https://cdn.islamic.network/quran/audio/128/7/001.mp3" };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedUrl));

      const result = await service.getAudioUrl(7, 1);

      expect(result.url).toBe(cachedUrl.url);
      expect(redis.get).toHaveBeenCalledWith("tafakkur:audio:7:1");
    });

    it("should generate and cache audio URL when Redis is empty", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getAudioUrl(7, 1);

      expect(result.url).toBe("https://cdn.islamic.network/quran/audio/128/ar.alafasy/001.mp3");
      expect(redis.set).toHaveBeenCalledWith(
        "tafakkur:audio:7:1",
        JSON.stringify({ url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/001.mp3" }),
        3600,
      );
    });

    it("should pad surah number to 3 digits", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getAudioUrl(7, 36);

      expect(result.url).toContain("/036.mp3");
    });

    it("should generate URL even when Redis get throws", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis down"));

      const result = await service.getAudioUrl(7, 1);

      expect(result.url).toBe("https://cdn.islamic.network/quran/audio/128/ar.alafasy/001.mp3");
    });

    it("should accept valid surah boundary 1", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getAudioUrl(7, 1);

      expect(result.url).toContain("/001.mp3");
    });

    it("should accept valid surah boundary 114", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getAudioUrl(7, 114);

      expect(result.url).toContain("/114.mp3");
    });
  });

  // ─── getSurahs ─────────────────────────────────────────────

  describe("getSurahs", () => {
    const mockSurahsApi = [
      { id: 1, name_arabic: "الفاتحة", name_simple: "Al-Fatihah", verses_count: 7 },
      { id: 2, name_arabic: "البقرة", name_simple: "Al-Baqarah", verses_count: 286 },
    ];

    it("should return cached surahs when Redis has data", async () => {
      const cachedSurahs = [
        { number: 1, name: "الفاتحة", englishName: "Al-Fatihah", versesCount: 7 },
      ];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSurahs));

      const result = await service.getSurahs();

      expect(result).toEqual(cachedSurahs);
      expect(redis.get).toHaveBeenCalledWith("tafakkur:surahs");
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("should fetch surahs from API and cache", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValueOnce({
        data: { chapters: mockSurahsApi },
      });

      const result = await service.getSurahs();

      expect(result).toHaveLength(2);
      expect(result[0].number).toBe(1);
      expect(result[0].englishName).toBe("Al-Fatihah");
      expect(result[0].name).toBe("الفاتحة");
      expect(result[0].versesCount).toBe(7);
      expect(redis.set).toHaveBeenCalledWith(
        "tafakkur:surahs",
        expect.any(String),
        86400,
      );
    });

    it("should return 114 fallback surahs when API fails", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.getSurahs();

      expect(result).toHaveLength(114);
      expect(result[0].englishName).toBe("Surah 1");
      expect(result[113].englishName).toBe("Surah 114");
    });

    it("should cache fallback surahs when API fails", async () => {
      mockRedis.get.mockResolvedValue(null);
      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await service.getSurahs();

      expect(redis.set).toHaveBeenCalledWith(
        "tafakkur:surahs",
        expect.any(String),
        86400,
      );
    });
  });
});