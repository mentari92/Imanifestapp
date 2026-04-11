import { Controller, Post, Patch, Body, Param, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { DuaToDoService } from "./dua-todo.service";
import { GenerateTasksDto } from "./dto/generate-tasks.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Controller("dua-to-do")
@UseGuards(JwtAuthGuard)
export class DuaToDoController {
  constructor(private readonly duaToDoService: DuaToDoService) {}

  @Post("generate")
  async generateTasks(
    @Request() req: { user: { userId: string } },
    @Body() dto: GenerateTasksDto,
  ) {
    return this.duaToDoService.generateTasks(req.user.userId, dto.manifestationId);
  }

  @Patch("tasks/:taskId")
  async updateTask(
    @Request() req: { user: { userId: string } },
    @Param("taskId") taskId: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.duaToDoService.updateTask(req.user.userId, taskId, body.isCompleted);
  }

  @Post("tasks")
  async getTasks(
    @Request() req: { user: { userId: string } },
    @Body() dto: GenerateTasksDto,
  ) {
    return this.duaToDoService.getTasks(req.user.userId, dto.manifestationId);
  }
}