import { Controller, Post, Patch, Body, Param, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/auth.guard";
import { DuaToDoService } from "./dua-todo.service";
import { GenerateTasksDto } from "./dto/generate-tasks.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { Public } from "../auth/public.decorator";

@Controller("dua-to-do")
@UseGuards(JwtAuthGuard)
export class DuaToDoController {
  constructor(private readonly duaToDoService: DuaToDoService) {}

  private resolveUserId(req: { user?: { userId: string } }): string {
    return req.user?.userId ?? "demo-user-123";
  }

  @Public()
  @Post("generate")
  async generateTasks(
    @Request() req: { user?: { userId: string } },
    @Body() dto: GenerateTasksDto,
  ) {
    return this.duaToDoService.generateTasks(this.resolveUserId(req), dto.manifestationId);
  }

  @Public()
  @Patch("tasks/:taskId")
  async updateTask(
    @Request() req: { user?: { userId: string } },
    @Param("taskId") taskId: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.duaToDoService.updateTask(this.resolveUserId(req), taskId, body.isCompleted);
  }

  @Public()
  @Post("tasks")
  async getTasks(
    @Request() req: { user?: { userId: string } },
    @Body() dto: GenerateTasksDto,
  ) {
    return this.duaToDoService.getTasks(this.resolveUserId(req), dto.manifestationId);
  }
}