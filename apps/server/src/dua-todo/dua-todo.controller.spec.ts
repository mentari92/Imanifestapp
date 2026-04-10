import { Test } from "@nestjs/testing";
import { DuaToDoController } from "./dua-todo.controller";
import { DuaToDoService } from "./dua-todo.service";
import { NotFoundException } from "@nestjs/common";

describe("DuaToDoController", () => {
  let controller: DuaToDoController;
  let service: DuaToDoService;

  const mockDuaToDoService = {
    generateTasks: jest.fn(),
    updateTask: jest.fn(),
    getTasks: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DuaToDoController],
      providers: [
        { provide: DuaToDoService, useValue: mockDuaToDoService },
      ],
    }).compile();

    controller = module.get<DuaToDoController>(DuaToDoController);
    service = module.get<DuaToDoService>(DuaToDoService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /dua-to-do/generate", () => {
    it("should generate tasks for a manifestation", async () => {
      const mockResult = {
        tasks: [
          { id: "task-1", description: "Step 1", isCompleted: false },
          { id: "task-2", description: "Step 2", isCompleted: false },
        ],
      };
      mockDuaToDoService.generateTasks.mockResolvedValue(mockResult);

      const result = await controller.generateTasks(
        { user: { userId: "user-1" } } as any,
        { manifestationId: "man-1" },
      );

      expect(result).toEqual(mockResult);
      expect(service.generateTasks).toHaveBeenCalledWith("user-1", "man-1");
    });

    it("should throw NotFoundException for invalid manifestation", async () => {
      mockDuaToDoService.generateTasks.mockRejectedValue(
        new NotFoundException("Manifestation not found"),
      );

      await expect(
        controller.generateTasks(
          { user: { userId: "user-1" } } as any,
          { manifestationId: "invalid" },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("PATCH /dua-to-do/tasks/:taskId", () => {
    it("should update task completion status", async () => {
      const mockUpdated = { id: "task-1", isCompleted: true };
      mockDuaToDoService.updateTask.mockResolvedValue(mockUpdated);

      const result = await controller.updateTask(
        { user: { userId: "user-1" } } as any,
        "task-1",
        { isCompleted: true },
      );

      expect(result).toEqual(mockUpdated);
      expect(service.updateTask).toHaveBeenCalledWith("user-1", "task-1", true);
    });

    it("should throw NotFoundException for invalid task", async () => {
      mockDuaToDoService.updateTask.mockRejectedValue(
        new NotFoundException("Task not found"),
      );

      await expect(
        controller.updateTask(
          { user: { userId: "user-1" } } as any,
          "invalid",
          { isCompleted: true },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("POST /dua-to-do/tasks", () => {
    it("should get tasks for a manifestation", async () => {
      const mockResult = {
        tasks: [{ id: "task-1", description: "Step 1" }],
      };
      mockDuaToDoService.getTasks.mockResolvedValue(mockResult);

      const result = await controller.getTasks(
        { user: { userId: "user-1" } } as any,
        { manifestationId: "man-1" },
      );

      expect(result).toEqual(mockResult);
      expect(service.getTasks).toHaveBeenCalledWith("user-1", "man-1");
    });
  });
});