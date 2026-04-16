import { Test } from "@nestjs/testing";
import { ImanSyncService, AnalyzeResult } from "./iman-sync.service";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";
import { RedisService } from "../common/redis.service";

describe("ImanSyncService", () => {
  let service: ImanSyncService;
  let prisma: PrismaService;
  let zhipu: ZhipuService;
  let quranApi: QuranApiService;
  let redis: RedisService;

  const mockPrisma = {
    manifestation: {
      create: jest.fn(),
    },
  };

  const mockZhipu = {
    extractThemes: jest.fn(),
    extractThemesVision: jest.fn(),
    generateSummary: jest.fn(),
  };

  const mockQuranApi = {
    searchVerses: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ImanSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZhipuService, useValue: mockZhipu },
        { provide: QuranApiService, useValue: mockQuranApi },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ImanSyncService>(ImanSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    zhipu = module.get<ZhipuService>(ZhipuService);
    quranApi = module.get<QuranApiService>(QuranApiService);
    redis = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("analyze", () => {
    const mockAnalysisResult: AnalyzeResult = {
      manifestationId: "manifest-1",
      verses: [
        {
          verseKey: "2:286",
          arabicText: "لَا يُكَلِّفُ ٱللَّهُ نَفۡسًا إِلَّا وُسۡعَهَا",
          translation: "Allah does not burden a soul beyond its scope",
          tafsirSnippet: "Tafsir snippet...",
        },
      ],
      aiSummary: "Your intention is supported by the Quran.",
      tasks: ["Pray on time", "Read 5 ayat daily"],
    };

    it("should return cached result when cache hit", async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockAnalysisResult));

      const result = await service.analyze("user-1", {
        intentText: "I want to be patient",
      });

      expect(result).toEqual(mockAnalysisResult);
      expect(redis.get).toHaveBeenCalled();
      // Should NOT call AI or Quran API
      expect(zhipu.extractThemes).not.toHaveBeenCalled();
      expect(quranApi.searchVerses).not.toHaveBeenCalled();
    });

    it("should run full pipeline when cache miss and cache the result", async () => {
      mockRedis.get.mockResolvedValue(null); // cache miss
      mockZhipu.extractThemes.mockResolvedValue(["patience", "perseverance"]);
      mockQuranApi.searchVerses.mockResolvedValue([
        {
          verseKey: "2:286",
          arabicText: "test",
          translation: "test translation",
          tafsirSnippet: "tafsir",
        },
      ]);
      mockZhipu.generateSummary.mockResolvedValue("AI summary");
      mockPrisma.manifestation.create.mockResolvedValue({ id: "manifest-1" });

      const result = await service.analyze("user-1", {
        intentText: "I want to be patient",
      });

      expect(result.manifestationId).toBe("manifest-1");
      expect(zhipu.extractThemes).toHaveBeenCalledWith("I want to be patient");
      expect(quranApi.searchVerses).toHaveBeenCalled();
      expect(zhipu.generateSummary).toHaveBeenCalled();
      expect(prisma.manifestation.create).toHaveBeenCalled();
      // Should cache the result with userId in key (data isolation)
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining("iman-sync:cache:user-1:"),
        expect.any(String),
        3600,
      );
    });

    it("should handle cache read failure gracefully", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis down"));
      mockZhipu.extractThemes.mockResolvedValue(["gratitude"]);
      mockQuranApi.searchVerses.mockResolvedValue([]);
      mockZhipu.generateSummary.mockResolvedValue("Summary");
      mockPrisma.manifestation.create.mockResolvedValue({ id: "m-1" });

      const result = await service.analyze("user-1", {
        intentText: "Grateful test",
      });

      expect(result.manifestationId).toBe("m-1");
    });
  });

  describe("analyzeVision", () => {
    it("should run full vision pipeline and save with imagePath", async () => {
      mockZhipu.extractThemesVision.mockResolvedValue(["vision theme"]);
      mockQuranApi.searchVerses.mockResolvedValue([]);
      mockZhipu.generateSummary.mockResolvedValue("Vision summary");
      mockPrisma.manifestation.create.mockResolvedValue({ id: "m-vision-1" });

      const result = await service.analyzeVision(
        "user-1",
        "I see myself peaceful",
        "base64data",
        "image/jpeg",
        "vision:photo.jpg:123",
      );

      expect(result.manifestationId).toBe("m-vision-1");
      expect(result.imagePath).toBe("vision:photo.jpg:123");
      expect(zhipu.extractThemesVision).toHaveBeenCalledWith(
        "I see myself peaceful",
        "base64data",
        "image/jpeg",
      );
      expect(prisma.manifestation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imagePath: "vision:photo.jpg:123",
          }),
        }),
      );
    });
  });
});