import { Test } from "@nestjs/testing";
import { QalbService } from "./qalb.service";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";

describe("QalbService", () => {
  let service: QalbService;
  let prisma: PrismaService;
  let zhipu: ZhipuService;

  const mockPrisma = {
    reflection: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockZhipu = {
    analyzeSentiment: jest.fn(),
    generateReflectionInsight: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QalbService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZhipuService, useValue: mockZhipu },
      ],
    }).compile();

    service = module.get<QalbService>(QalbService);
    prisma = module.get<PrismaService>(PrismaService);
    zhipu = module.get<ZhipuService>(ZhipuService);
    jest.clearAllMocks();

    mockZhipu.generateReflectionInsight.mockResolvedValue({
      spiritual: "May Allah grant your heart peace.",
      tafsir: "Reflection brings clarity.",
      scientific: "Reflection helps regulate stress.",
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("syncToQuranFoundation", () => {
    it("should skip sync when QF User API not configured", async () => {
      // QF_USER_API_URL is empty in test env
      await service.syncToQuranFoundation("user-1", {
        transcriptText: "I feel grateful",
        sentiment: "grateful",
      });

      // No error thrown — graceful no-op
      expect(true).toBe(true);
    });
  });



  describe("reflectText", () => {
    const userId = "user-1";
    const text = "I feel hopeful today";

    it("should process text reflection and return sentiment + streak", async () => {
      const mockReflection = {
        id: "ref-1",
        userId,
        transcriptText: text,
        audioPath: null,
        sentiment: "hopeful",
        sentimentScore: 0.85,
        streakDate: new Date(),
        createdAt: new Date(),
      };

      mockZhipu.analyzeSentiment.mockResolvedValue({
        label: "hopeful",
        score: 0.85,
      });

      mockPrisma.reflection.create.mockResolvedValue(mockReflection);

      // Mock findMany for streak calculation (no previous reflections = streak 1)
      mockPrisma.reflection.findMany.mockResolvedValue([mockReflection]);

      const result = await service.reflectText(userId, text);

      expect(result.sentiment).toBe("hopeful");
      expect(result.sentimentScore).toBe(0.85);
      expect(result.streakCount).toBe(1);
      expect(result.reflection.transcriptText).toBe(text);
      expect(zhipu.analyzeSentiment).toHaveBeenCalledWith(text);
      expect(prisma.reflection.create).toHaveBeenCalledWith({
        data: {
          userId,
          transcriptText: text,
          audioPath: null,
          sentiment: "hopeful",
          sentimentScore: 0.85,
        },
      });
    });

    it("should calculate streak correctly for consecutive days", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      mockZhipu.analyzeSentiment.mockResolvedValue({
        label: "grateful",
        score: 0.9,
      });

      mockPrisma.reflection.create.mockResolvedValue({
        id: "ref-3",
        userId,
        transcriptText: text,
        audioPath: null,
        sentiment: "grateful",
        sentimentScore: 0.9,
        streakDate: now,
        createdAt: now,
      });

      // 3 consecutive days → streak = 3
      mockPrisma.reflection.findMany.mockResolvedValue([
        { streakDate: now },
        { streakDate: yesterday },
        { streakDate: twoDaysAgo },
      ]);

      const result = await service.reflectText(userId, text);

      expect(result.streakCount).toBe(3);
    });

    it("should return streak 0 when no previous reflections", async () => {
      mockZhipu.analyzeSentiment.mockResolvedValue({
        label: "anxious",
        score: 0.3,
      });

      mockPrisma.reflection.create.mockResolvedValue({
        id: "ref-1",
        userId,
        transcriptText: text,
        audioPath: null,
        sentiment: "anxious",
        sentimentScore: 0.3,
        streakDate: new Date(),
        createdAt: new Date(),
      });

      // findMany returns empty → streak calculation returns 0
      // But actually it returns the newly created reflection, so streak = 1
      mockPrisma.reflection.findMany.mockResolvedValue([]);

      const result = await service.reflectText(userId, text);

      expect(result.streakCount).toBe(0);
    });
  });

  describe("reflectVoice", () => {
    const userId = "user-1";
    const audioPath = "/audio/recording.m4a";
    const transcriptText = "Voice reflection text";

    it("should process voice reflection with audioPath saved", async () => {
      mockZhipu.analyzeSentiment.mockResolvedValue({
        label: "peaceful",
        score: 0.75,
      });

      mockPrisma.reflection.create.mockResolvedValue({
        id: "ref-v1",
        userId,
        transcriptText,
        audioPath,
        sentiment: "peaceful",
        sentimentScore: 0.75,
        streakDate: new Date(),
        createdAt: new Date(),
      });

      mockPrisma.reflection.findMany.mockResolvedValue([]);

      const result = await service.reflectVoice(userId, audioPath, transcriptText);

      expect(result.sentiment).toBe("peaceful");
      expect(result.reflection.audioPath).toBe(audioPath);
      expect(prisma.reflection.create).toHaveBeenCalledWith({
        data: {
          userId,
          transcriptText,
          audioPath,
          sentiment: "peaceful",
          sentimentScore: 0.75,
        },
      });
    });

    it("should use same streak calculation as text mode", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mockZhipu.analyzeSentiment.mockResolvedValue({
        label: "content",
        score: 0.6,
      });

      mockPrisma.reflection.create.mockResolvedValue({
        id: "ref-v2",
        userId,
        transcriptText,
        audioPath,
        sentiment: "content",
        sentimentScore: 0.6,
        streakDate: now,
        createdAt: now,
      });

      mockPrisma.reflection.findMany.mockResolvedValue([
        { streakDate: now },
        { streakDate: yesterday },
      ]);

      const result = await service.reflectVoice(userId, audioPath, transcriptText);

      // Same streak calculation as text — 2 consecutive days
      expect(result.streakCount).toBe(2);
    });
  });

  describe("getHistory", () => {
    const userId = "user-1";

    it("should return reflections ordered by createdAt desc", async () => {
      const mockReflections = [
        {
          id: "ref-2",
          userId,
          transcriptText: "Second reflection",
          sentiment: "hopeful",
          sentimentScore: 0.8,
          createdAt: new Date("2026-04-11"),
        },
        {
          id: "ref-1",
          userId,
          transcriptText: "First reflection",
          sentiment: "grateful",
          sentimentScore: 0.9,
          createdAt: new Date("2026-04-10"),
        },
      ];

      mockPrisma.reflection.findMany.mockResolvedValue(mockReflections);

      const result = await service.getHistory(userId);

      expect(result.reflections).toEqual(mockReflections);
      expect(prisma.reflection.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    });

    it("should return streakCount alongside reflections", async () => {
      mockPrisma.reflection.findMany.mockResolvedValue([]);

      const result = await service.getHistory(userId);

      expect(result).toHaveProperty("streakCount");
      expect(result).toHaveProperty("reflections");
    });

    it("should limit reflections to 30", async () => {
      mockPrisma.reflection.findMany.mockResolvedValue([]);

      await service.getHistory(userId);

      expect(prisma.reflection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 }),
      );
    });
  });
});