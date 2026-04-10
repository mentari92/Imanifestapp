import { Test } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ImanSyncController } from "./iman-sync.controller";
import { ImanSyncService } from "./iman-sync.service";
import { RedisService } from "../common/redis.service";

describe("ImanSyncController", () => {
  let controller: ImanSyncController;
  let service: ImanSyncService;
  let redis: RedisService;

  const mockImanSyncService = {
    analyze: jest.fn(),
    analyzeVision: jest.fn(),
  };

  const mockRedisService = {
    incr: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ImanSyncController],
      providers: [
        { provide: ImanSyncService, useValue: mockImanSyncService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<ImanSyncController>(ImanSyncController);
    service = module.get<ImanSyncService>(ImanSyncService);
    redis = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /iman-sync/analyze", () => {
    const mockResult = {
      manifestationId: "test-id",
      verses: [],
      aiSummary: "test summary",
    };

    it("should return analysis result when within rate limit", async () => {
      mockRedisService.incr.mockResolvedValue(1);
      mockImanSyncService.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze(
        { user: { userId: "user-1" } } as any,
        { intentText: "I want to be more grateful" },
      );

      expect(result).toEqual(mockResult);
      expect(redis.incr).toHaveBeenCalledWith(
        "rate:iman-sync:text:user-1",
        3600,
      );
      expect(service.analyze).toHaveBeenCalledWith("user-1", {
        intentText: "I want to be more grateful",
      });
    });

    it("should throw 429 when text rate limit exceeded (10/hr)", async () => {
      mockRedisService.incr.mockResolvedValue(11);

      await expect(
        controller.analyze(
          { user: { userId: "user-1" } } as any,
          { intentText: "test" },
        ),
      ).rejects.toThrow(HttpException);

      try {
        await controller.analyze(
          { user: { userId: "user-1" } } as any,
          { intentText: "test" },
        );
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(429);
      }
    });

    it("should allow request when Redis is unavailable (count=0)", async () => {
      mockRedisService.incr.mockResolvedValue(0);
      mockImanSyncService.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze(
        { user: { userId: "user-1" } } as any,
        { intentText: "test" },
      );

      expect(result).toEqual(mockResult);
    });

    it("should allow 10th request (boundary)", async () => {
      mockRedisService.incr.mockResolvedValue(10);
      mockImanSyncService.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze(
        { user: { userId: "user-1" } } as any,
        { intentText: "test" },
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe("POST /iman-sync/analyze-vision", () => {
    const mockFile = {
      buffer: Buffer.from("fake-image"),
      mimetype: "image/jpeg",
      size: 1024,
      originalname: "test.jpg",
    } as Express.Multer.File;

    const mockVisionResult = {
      manifestationId: "test-id",
      verses: [],
      aiSummary: "vision summary",
      imagePath: "vision:test.jpg:123",
    };

    it("should throw 429 when vision rate limit exceeded (5/hr)", async () => {
      mockRedisService.incr.mockResolvedValue(6);

      await expect(
        controller.analyzeVision(
          { user: { userId: "user-1" } } as any,
          "test intention",
          mockFile,
        ),
      ).rejects.toThrow(HttpException);

      try {
        await controller.analyzeVision(
          { user: { userId: "user-1" } } as any,
          "test intention",
          mockFile,
        );
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(429);
      }
    });

    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.analyzeVision(
          { user: { userId: "user-1" } } as any,
          "test intention",
          undefined,
        ),
      ).rejects.toThrow("Image file is required");
    });
  });
});