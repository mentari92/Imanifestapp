import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { DuaToDoService } from "./dua-todo.service";
import { PrismaService } from "@imanifest/database";
import { ZhipuService } from "../common/zhipu.service";
import { QuranApiService } from "../common/quran-api.service";

describe("DuaToDoService", () => {
  let service: DuaToDoService;
  let prisma: PrismaService;
  let zhipu: ZhipuService;
  let quranApi: QuranApiService;

  const mockPrisma = {
    manifestation: {
      findFirst: jest.fn(),
    },
    task: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockZhipu = {
    generateTasks: jest.fn(),
  };

  const mockQuranApi = {
    postGoal: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DuaToDoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZhipuService, useValue: mockZhipu },
        { provide: QuranApiService, useValue: mockQuranApi },
      ],
    }).compile();

    service = module.get<DuaToDoService>(DuaToDoService);
    prisma = module.get<PrismaService>(PrismaService);
    zhipu = module.get<ZhipuService>(ZhipuService);
    quranApi = module.get<QuranApiService>(QuranApiService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateTasks", () => {
    const userId = "user-1";
    const manifestationId = "man-1";
    const mockManifestation = {
      id: manifestationId,
      userId,
      intentText: "I want to be more grateful",
      verses: [{ verseKey: "1:1", translation: "In the name of Allah" }],
      user: { quranApiKey: "test-key" },
    };

    it("should throw NotFoundException if manifestation not found", async () => {
      mockPrisma.manifestation.findFirst.mockResolvedValue(null);

      await expect(
        service.generateTasks(userId, manifestationId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should generate and save tasks", async () => {
      const descriptions = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"];

      mockPrisma.manifestation.findFirst.mockResolvedValue(mockManifestation);
      mockZhipu.generateTasks.mockResolvedValue(descriptions);

      mockPrisma.task.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: `task-${data.description.split(" ")[1]}`,
          manifestationId,
          description: data.description,
          isCompleted: false,
          quranGoalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      mockQuranApi.postGoal.mockResolvedValue(null);

      const result = await service.generateTasks(userId, manifestationId);

      expect(result.tasks).toHaveLength(5);
      expect(result.tasks[0].description).toBe("Step 1");
      expect(zhipu.generateTasks).toHaveBeenCalledWith(
        "I want to be more grateful",
        mockManifestation.verses,
      );
      expect(prisma.task.create).toHaveBeenCalledTimes(5);
    });

    it("should store quranGoalId when Goals API succeeds", async () => {
      mockPrisma.manifestation.findFirst.mockResolvedValue(mockManifestation);
      mockZhipu.generateTasks.mockResolvedValue(["Step 1"]);

      mockPrisma.task.create.mockResolvedValue({
        id: "task-1",
        manifestationId,
        description: "Step 1",
        isCompleted: false,
        quranGoalId: null,
      });

      mockQuranApi.postGoal.mockResolvedValue("goal-abc");
      mockPrisma.task.update.mockResolvedValue({
        id: "task-1",
        manifestationId,
        description: "Step 1",
        isCompleted: false,
        quranGoalId: "goal-abc",
      });

      const result = await service.generateTasks(userId, manifestationId);

      expect(quranApi.postGoal).toHaveBeenCalledWith("test-key", "Step 1");
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: "task-1" },
        data: { quranGoalId: "goal-abc" },
      });
      expect(result.tasks[0].quranGoalId).toBe("goal-abc");
    });

    it("should continue gracefully when Goals API fails", async () => {
      mockPrisma.manifestation.findFirst.mockResolvedValue(mockManifestation);
      mockZhipu.generateTasks.mockResolvedValue(["Step 1"]);

      mockPrisma.task.create.mockResolvedValue({
        id: "task-1",
        manifestationId,
        description: "Step 1",
        isCompleted: false,
        quranGoalId: null,
      });

      mockQuranApi.postGoal.mockRejectedValue(new Error("API down"));

      const result = await service.generateTasks(userId, manifestationId);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].quranGoalId).toBeNull();
    });

    it("should continue when postGoal returns null", async () => {
      mockPrisma.manifestation.findFirst.mockResolvedValue(mockManifestation);
      mockZhipu.generateTasks.mockResolvedValue(["Step 1"]);

      mockPrisma.task.create.mockResolvedValue({
        id: "task-1",
        manifestationId,
        description: "Step 1",
        isCompleted: false,
        quranGoalId: null,
      });

      mockQuranApi.postGoal.mockResolvedValue(null);

      const result = await service.generateTasks(userId, manifestationId);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].quranGoalId).toBeNull();
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("should throw NotFoundException if task not found", async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTask("user-1", "task-1", true),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if task belongs to different user", async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        manifestation: { userId: "other-user" },
      });

      await expect(
        service.updateTask("user-1", "task-1", true),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update task when ownership matches", async () => {
      const mockUpdated = {
        id: "task-1",
        isCompleted: true,
        description: "Step 1",
      };
      mockPrisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        manifestation: { userId: "user-1" },
      });
      mockPrisma.task.update.mockResolvedValue(mockUpdated);

      const result = await service.updateTask("user-1", "task-1", true);

      expect(result).toEqual(mockUpdated);
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: "task-1" },
        data: { isCompleted: true },
      });
    });

    it("should toggle task from completed to uncompleted", async () => {
      const mockUpdated = {
        id: "task-1",
        isCompleted: false,
        description: "Step 1",
      };
      mockPrisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        manifestation: { userId: "user-1" },
      });
      mockPrisma.task.update.mockResolvedValue(mockUpdated);

      const result = await service.updateTask("user-1", "task-1", false);

      expect(result).toEqual(mockUpdated);
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: "task-1" },
        data: { isCompleted: false },
      });
    });
  });

  describe("getTasks", () => {
    it("should throw NotFoundException if manifestation not found", async () => {
      mockPrisma.manifestation.findFirst.mockResolvedValue(null);

      await expect(
        service.getTasks("user-1", "man-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return tasks ordered by createdAt", async () => {
      const mockTasks = [
        { id: "task-1", description: "Step 1", createdAt: new Date() },
        { id: "task-2", description: "Step 2", createdAt: new Date() },
      ];
      mockPrisma.manifestation.findFirst.mockResolvedValue({ id: "man-1" });
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasks("user-1", "man-1");

      expect(result.tasks).toEqual(mockTasks);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { manifestationId: "man-1" },
        orderBy: { createdAt: "asc" },
      });
    });
  });
});